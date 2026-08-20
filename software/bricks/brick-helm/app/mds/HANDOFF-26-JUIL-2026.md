# Handoff — 26 juillet 2026

Session : correction de la lenteur de saisie du composer sur mobile, mise en place
d'un déploiement prod fiable, et synchronisation `gbs-h1` → `gbs-tools`.

Document destiné à un agent qui reprend le travail sans contexte préalable.

---

## 1. État actuel — tout est déployé et vérifié

| | gbs-h1 | gbs-tools |
|---|---|---|
| Bundle servi | `assets/index-cBw901_f.js` | `assets/index-cBw901_f.js` (identique) |
| Tests (`npm test`) | 148 pass / 0 fail | 148 pass / 0 fail |
| API `:7926` | HTTP 200 | HTTP 200 |
| Web `:7923` | HTTP 200 | HTTP 200 |
| Mode | `vite preview` (prod, sans HMR) | `vite preview` (prod, sans HMR) |

**Les deux hôtes servent exactement le même code** (même hash de bundle).

**Rien n'est bloqué.** Le seul reste optionnel : le commit n'est pas poussé.

---

## 2. Les deux machines

### gbs-h1 (locale)
- Chemin : `/apps/helm-v2/app`
- **Dépôt git** — c'est ici qu'on développe.
- pm2 sous l'utilisateur `helm-v2`. Depuis root : `su - helm-v2 -c 'pm2 list'`
  (pas de `sudo` sur cette machine).

### gbs-tools (distante)
- `ssh gbs-tools` → 192.168.10.150, via `ProxyJump gbs-p2`.
- Chemin identique : `/apps/helm-v2/app`
- **PAS un dépôt git** — copie déployée. Toute modif faite directement là-bas
  est hors versioning et sera écrasée à la prochaine synchro.
- C'est **la cible mobile réelle** (`helm2.xavdp.pro`).
- `sudo` existe ici (contrairement à gbs-h1).

### Pièges SSH rencontrés (важно)
1. **Un `cd` en début de commande SSH est perdu** : la commande s'exécute dans
   `/root`. Toujours utiliser des chemins absolus, ou `ssh host "cd /chemin; cmd"`.
2. **`runuser` réinitialise aussi le répertoire courant.** Pour npm :
   `runuser -u helm-v2 -- npm --prefix /apps/helm-v2/app <cmd>`.
3. `/proc/<pid>/cmdline` **ne montre pas les arguments pm2** (on y voit juste
   `node .../vite`). Pour connaître le vrai mode : `pm2 describe helm-v2-vite`.

---

## 3. Le bug corrigé : saisie inutilisable sur mobile

### Cause
L'état `draft` (le texte tapé) vit dans `Dashboard.jsx` (~1800 lignes). Chaque
frappe re-rendait tout l'arbre, **y compris `RunTimeline`, qui re-parse le
markdown de tout l'historique** (`StreamingMarkdown`, + mermaid/katex). Sur CPU
mobile, chaque lettre coûtait un re-rendu complet de la conversation.

Il n'y avait **aucune mémoïsation** dans le projet.

### Les 4 correctifs

1. **`RunTimeline` mémoïsé** — `src/components/RunTimeline.jsx:992`
   `export default memo(RunTimeline);`

2. **`workspaceCwd` stabilisé** — `src/pages/Dashboard.jsx:440`
   C'était un `.find()` inline → nouvelle valeur à chaque rendu → cassait le memo.
   Passé en `useMemo`.

3. **`onEditHuman` stabilisé** — `src/pages/Dashboard.jsx:983`
   Fonction recréée à chaque rendu → cassait le memo. Wrapper `useCallback` via
   ref (idiome déjà utilisé ailleurs dans le fichier, cf. `handleVoiceEventRef`).

4. **Suppression du `setInterval(…, 48)`** de scroll pendant le streaming.
   Il forçait ~21 snaps/seconde et se battait avec le scroll de l'utilisateur.
   Le `ResizeObserver` juste en dessous couvre déjà le cas (rAF + seuil de 8px).

> **Note** : `src/components/ChatPanel.jsx` contient un `setInterval(scroll, 48)`
> identique, mais **ce fichier n'est importé nulle part** (code mort). Dashboard
> rend `RunTimeline` + `ChatInput` directement. Non touché volontairement.

### Ce qui n'était PAS le problème
L'utilisateur soupçonnait le micro / la transcription. Vérifié : l'intervalle de
120 ms dans `useChatVoice.js` est bien gardé par `if (!micLive) return` et ne
touche que des refs (pas d'état React). Il ne tourne pas hors micro.

---

## 4. Déploiement — `npm run deploy`

### Le piège historique
`vite preview` sert `dist/`. Si le build échoue, **ou si `dist/` appartient à
`root`** (build lancé en sudo) alors que pm2 tourne en `helm-v2`, le serveur
continue de servir l'ancien bundle **sans aucune erreur visible**.

Constaté : **87 fichiers root-owned** dans `src/` et `dist/` sur gbs-h1
(1 sur gbs-tools). Corrigé.

### Le script
`scripts/deploy-prod.sh` (branché sur `npm run deploy` ; l'ancienne commande est
conservée sous `npm run deploy:legacy`).

Enchaînement :
1. Normalise les droits (`helm-v2:www-data`) sur `src/ dist/ public/`
2. Build via `runuser -u helm-v2` (pour que `dist/` reste au bon propriétaire)
3. `pm2 startOrReload ecosystem.prod.config.cjs --update-env`
4. **Vérifie en HTTP** que le hash du bundle servi == celui qu'on vient de
   construire, et qu'il n'y a pas de `@vite/client` (= pas de HMR)
5. Sort en erreur si le serveur sert encore l'ancien bundle

Ce garde-fou a **déjà bloqué un déploiement cassé** pendant la session — il fait
son travail, ne pas le contourner.

### Usage
```bash
# gbs-h1
cd /apps/helm-v2/app && npm run deploy

# gbs-tools
ssh gbs-tools "cd /apps/helm-v2/app; npm run deploy"
```

---

## 5. Rafraîchissement PWA côté client

### Correction d'une hypothèse fausse
Le service worker **ne mettait rien en cache**. `VitePWA` est en
`selfDestroying: true` (le SW se désinscrit, aucun précache — `dist/sw.js` fait
608 octets) et `vite.config.js` envoie `Cache-Control: no-store` en `server`
**et** en `preview`.

Le vrai problème : **un onglet / une PWA déjà ouvert garde son bundle en mémoire
indéfiniment**. Aucun cache à purger — le client ignorait juste qu'un
déploiement avait eu lieu.

### La solution
`src/lib/appUpdate.js` — `watchForUpdate(onUpdate)` :
- sonde `/` toutes les 60 s **et au retour au premier plan** (moment clé mobile)
- compare le hash `assets/index-XXXX.js` servi à celui du bundle en cours
  d'exécution (via `import.meta.url`)
- déclenche le rechargement si ça diffère

Branché dans `Dashboard.jsx:1078`. **Garde-fou important** : ne recharge jamais
pendant un tour de voix ou un run — attend que `clientBusy` retombe
(`Dashboard.jsx:1068` : `voiceMicLive || voicePlaying || voiceBusy ||
presentationBlocking || sending || streaming`). Toast `app.updateReloading`
(fr/es/en) avant rechargement.

### Rechargement manuel (si besoin)
- Le plus fiable : ajouter `?v=<n>` à l'URL en changeant le nombre.
- PWA mobile : **fermer complètement** l'app (balayer depuis la liste des apps,
  pas juste revenir à l'accueil) puis rouvrir.
- Navigateur : `Ctrl+Shift+R` / `Cmd+Shift+R`.

---

## 6. Le commit

**Branche `feat/mobile-composer-perf-pwa`, commit `23ab7b3`** (basé sur
`e777fb6` de `main`). 18 fichiers, +7171 / −2622.

Contient, au-delà des correctifs ci-dessus, du travail en cours qui était déjà
non commité dans l'arbre (relu avant commit) :
- support PWA : manifest, icônes, `PwaInstallBanner`, `usePwaInstall`, `registerSW`
- `server/routes/timeline.js` : résolution des chemins via `parseConversationId`
- `server/lib/agentPlugins.js` : lecture du token bridge depuis fichier
  (`~/.config/*-bridge/token`) prioritaire sur `.env`
- `package-lock.json` : +9228 lignes (ajout de `vite-plugin-pwa`)

**Non commité volontairement** (état local machine, pas du code applicatif) :
`.claude/`, `_kovzu/`, `helmv2.code-workspace`.

**Vérifié avant commit** : `.env` bien dans `.gitignore` et non suivi ; scan de
secrets sur le diff → rien.

> ⚠️ **Le commit n'est PAS poussé.** À faire si souhaité :
> `git push -u origin feat/mobile-composer-perf-pwa`

---

## 7. Synchronisation gbs-h1 → gbs-tools

Les deux hôtes avaient divergé : **12 fichiers absents, 35 différents** sur
gbs-tools (tout un sous-système de contexte manquant).

### ⚠️ Ne JAMAIS synchroniser le `.env`
Les deux machines sont provisionnées différemment :
- **gbs-tools seul** : `MYSQL_*`, `JWT_SECRET`, `CLI_SSH_CONFIG`,
  `DEPLOYMENT_PROFILE`, `HELM_TIMELINE_DIR`, `PORT`, `NODE_ENV`
- **gbs-h1 seul** : clés voix (`CARTESIA_*`, `DEEPGRAM_*`, `ELEVENLABS_*`),
  `CLI_NODES`, `CLI_SESSION_WORKSPACES`, `MAILJET_*`, `APP_MODE`

Écraser le `.env` de gbs-tools casserait la machine.

### Procédure utilisée (reproductible)
```bash
# 1. Sauvegarde sur la cible
ssh gbs-tools "cd /apps/helm-v2/app && \
  tar czf /tmp/helm-v2-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  src server scripts package.json vite.config.js index.html"

# 2. Archive depuis le commit (jamais l'arbre de travail, jamais .env)
cd /apps/helm-v2/app
git archive --format=tar HEAD \
  src server scripts public package.json package-lock.json \
  vite.config.js index.html > /tmp/helm-v2-sync.tar

# 3. Transfert + extraction
ssh gbs-tools "cat > /tmp/helm-v2-sync.tar && cd /apps/helm-v2/app && \
  tar xf /tmp/helm-v2-sync.tar && \
  chown -R helm-v2:www-data src server scripts public package.json \
  package-lock.json vite.config.js index.html" < /tmp/helm-v2-sync.tar

# 4. Dépendances (package.json a changé) — noter le --prefix
ssh gbs-tools "runuser -u helm-v2 -- npm --prefix /apps/helm-v2/app ci --no-audit --no-fund"

# 5. Déploiement vérifié
ssh gbs-tools "cd /apps/helm-v2/app; npm run deploy"
```

Sauvegarde de cette session : `/tmp/helm-v2-backup-20260726-113830.tar.gz` sur
gbs-tools (à considérer comme éphémère, `/tmp`).

### Effets de bord positifs constatés
- gbs-tools est passé de **136 à 148 tests** (le sous-système de contexte
  manquant est arrivé : `contextDigest`, `contextSession`, `rollingContext`,
  `attachmentRegistry`, `routes/context.js`).
- Ses logs montraient des **`SSE claude: HTTP 401` en boucle toutes les 3 s**.
  Le correctif `agentPlugins.js` (token bridge lu depuis fichier) les a fait
  disparaître. Redémarrage propre à 11:40, MariaDB OK, bridges `cursor` +
  `claude` consomment normalement.

---

## 8. Ce qui reste à faire / points d'attention

### Non fait, en attente d'arbitrage
- **Pousser le commit** (`git push -u origin feat/mobile-composer-perf-pwa`) ou
  ouvrir une PR. Rien n'a été poussé.
- **Mesurer le gain réel sur mobile.** Les correctifs sont déployés et vérifiés
  côté serveur/bundle, mais **aucune mesure n'a été faite dans un vrai
  navigateur mobile**. C'est la validation qui manque.

### Dette technique repérée (non traitée)
- `src/components/ChatPanel.jsx` : code mort (importé nulle part), contient un
  `setInterval(scroll, 48)`. À supprimer ou à réintégrer.
- Bundle principal : **1,5 Mo** (~490 Ko gzip). Vite avertit à chaque build.
  Mermaid (635 Ko) et cytoscape (444 Ko) dominent — candidats évidents au
  code-splitting dynamique.
- `Dashboard.jsx` fait ~1800 lignes et détient l'état `draft`. La mémoïsation
  traite le symptôme ; extraire le composer dans son propre composant avec état
  local serait la vraie correction structurelle.
- Pas de configuration ESLint dans le projet (`npx eslint` échoue).

### Commandes de vérification rapide
```bash
# Le serveur sert-il bien le dernier build ?
curl -s http://127.0.0.1:7923/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'

# Mode prod confirmé (doit ne rien retourner) ?
curl -s http://127.0.0.1:7923/ | grep '@vite/client'

# Les correctifs sont-ils dans le bundle live ?
grep -c ',48)' dist/assets/index-*.js   # doit valoir 0
grep -oc 'memo(' dist/assets/index-*.js # doit valoir 2

# Santé
curl -s http://127.0.0.1:7926/api/health
```

### Note sur les tests
Le projet utilise **`node --test`**, pas vitest. `npx vitest run` échoue sur les
38 fichiers ("No test suite found") — c'est normal, ce n'est pas une régression.
Utiliser `npm test`.
