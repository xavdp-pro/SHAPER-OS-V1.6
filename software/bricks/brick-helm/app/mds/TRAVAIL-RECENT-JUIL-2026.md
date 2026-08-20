# Travail récent — juillet 2026 (KovZu / helm-v2)

Récap pour agents parallèles : **ce qui a été fait**, **où c’est dans le code**, **comment tester**.

Prod : https://helm2.xavdp.pro · Code : `/apps/helm-v2/app`

---

## 1. Sessions & workspaces (multi-machine)

### Stepper « Nouvelle session » (modale 4 étapes)

- **Machine** → liste SSH + bridges (`CLI_NODES` + `~/.ssh/config`)
- **User** → select avec croix pour vider + saisie libre
- **Path** → explorateur distant (`WorkspacePicker`) + saisie absolue
- **Confirm** → nom session + preview `machine/user/nom`

**Fichiers :**

| Fichier | Rôle |
|---------|------|
| `src/components/ConversationStepper.jsx` | Modale stepper |
| `src/components/WorkspacePicker.jsx` | Navigation dossiers distants |
| `src/components/PickerMenu.jsx` | Select searchable (`inline`, `tall`, `clearable`) |
| `src/lib/workspaceTemplates.js` | `sessionNameFromPath`, layouts Bureau/Turbinobash |
| `server/lib/remoteFs.js` | Browse SSH ou bridge (`GET /api/fs/browse`) |
| `server/lib/sessionCatalog.js` | Catalogue machines + layouts (miroir serveur) |
| `server/routes/conversations.js` | `POST /conversations/register` |

### Nom de session = dernier dossier du path

- Path `/home/zaza/Bureau/CURSOR` → session **CURSOR** (pas « Bureau »)
- Auto-sync tant que l’utilisateur n’a pas édité le nom (`sessionNameTouched`)
- Titre UI (header + sidebar) : `machine / user / CURSOR` via `sessionTriple()` + `sessionNameFromPath(cwd)`

**Fichiers :** `ConversationListItem.jsx`, `workspaceTemplates.js`, `workspaceTemplates.test.js`

### Routing inject CLI

Chaque session pointe vers **un seul cwd** sur **une machine** via le bridge de cette machine. Ne pas créer de sessions helm-v1/h1 pour des projets acer/asus.

---

## 2. Reborn (ex-« Vider »)

- Action menu : **Reborn** (icône `RotateCcw`)
- Effet : stop CLI → timeline vide → reset session → **re-prime présentation**
- Toast : « Reborn — contexte rechargé, présentation en cours »

**Fichiers :**

| Fichier | Rôle |
|---------|------|
| `src/hooks/useSessionPresentation.js` | `clearSession`, `primeSession`, `maybePrimeEmpty` |
| `server/lib/sessionOrchestrator.js` | Orchestration clear + prime |
| `server/routes/session.js` | `POST /api/session/clear`, `/session/prime` |
| `src/lib/locale.js` | Clés `clear.*` → Reborn |

---

## 3. Présentation Zephir (briefing / prime)

### Comportement attendu

1. Session vide ou Reborn → run **prime** (flag `prime: true` sur timeline)
2. Zephir salue par prénom, explique KovZu + Zephir
3. **Dernière phrase obligatoire** : inviter à cliquer le **point d’interrogation** en haut à droite (tour guidé)
4. Pulse UI sur le bouton aide après présentation terminée (`helpNudge`)
5. **Karaoké + voix démarrent seuls** à la fin du briefing (sans clic ▶)

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `server/lib/sessionPrime.js` | Prompt injecté au démarrage (FR/EN/ES) |
| `src/lib/sessionPresentation.js` | `shouldPrimeSession`, `getCompletedPrimeRun`, `getPrimeAssistantBlock` |
| `src/pages/Dashboard.jsx` | Auto `replaySpeech` quand prime terminé ; pulse aide |
| `src/hooks/useChatVoice.js` | `prepareForPresentation`, bypass live SSE pendant prime |
| `src/components/ConsoleHelpOverlay.jsx` | Tour guidé 11 étapes |

### Consigne FR (extrait)

> « Clique sur le **point d’interrogation** en haut à droite pour un tour guidé. »

(Ne plus dire « ? » seul — Zephir doit prononcer « point d’interrogation ».)

---

## 4. Voix & karaoké

### Stack

| Couche | Provider | Notes |
|--------|----------|-------|
| STT | Deepgram (WS) | Micro → draft input |
| TTS stream | **Cartesia Sonic** | Karaoké mot-à-mot (`word_timestamps`) |
| TTS HTTP | Deepgram / ElevenLabs | Pas de karaoké |
| Ack tour voix | **Groq** | Avant inject Composer |

Karaoké UI actif **uniquement** si `TTS_PROVIDER=cartesia`.

### Bug double voix (corrigé)

**Causes :**

1. Texte stream dupliqué (`phrase.phrase…`) → `undoubleText` / `undoubleSpeechText`
2. SSE `response` + `response_complete` parlaient tous les deux
3. Cartesia : `push()` + `end()` sur plusieurs chunks = deux synthèses superposées

**Correctifs (`useChatVoice.js`, `runStream.js`, `voiceCursorLoop.js`) :**

- Parler uniquement sur `response_complete` en mode Cartesia WS
- Ignorer `run_complete` pour la voix stream
- Un seul `end(utterance)` quand possible
- Garde `spokenGuardRef` anti-doublon

### Présentation + karaoké auto

- Pendant prime : pas de live SSE TTS (évite conflit avec `inject`)
- À la fin du prime : `replaySpeech(texte assistant)` automatique
- `getPresentationActive()` autorise la voix même si toggle speaker off (briefing uniquement)

### Karaoké ≠ affichage markdown

- Le **markdown complet** (tableaux, graphiques) reste visible
- Bandeau « Lecture » sous la bulle avec surlignage mot-à-mot
- TTS convertit les tableaux en prose ; l’affichage chat n’est pas remplacé

**Fichiers :** `RunTimeline.jsx`, `InlineKaraokeText.jsx`, `voiceCursorLoop.js`

---

## 5. UI console

### Scroll auto conversation

Comportement type ChatGPT :

- **Décrochage** : dès que l’utilisateur scroll vers le haut → plus de suivi auto
- **Raccrochage** : retour en bas (ou bouton « Aller en bas ») → suivi auto reprend pendant le stream
- Implémentation : `stickBottomRef`, `atBottom`, `lastScrollTopRef` dans `Dashboard.jsx`

### Wake lock

Écran allumé pendant : micro, lecture voix, présentation, envoi message.

**Fichier :** `src/hooks/useWakeLock.js`

### Pull-to-refresh

Recharger la conversation sur mobile (PTR natif bloqué par le shell SPA).

**Fichier :** `src/hooks/usePullToRefresh.js`

---

## 6. Livrables agent (format réponses)

Consignes injectées à **chaque message** CLI (`server/lib/locale.js`) :

- Tableau demandé → markdown GFM immédiat
- Graphique → fichier/code HTML-SVG ou script
- Excel → `.xlsx` / `.csv` réel dans le workspace
- Mode voix : le **texte affiché** = livrable complet ; pas de « je m’en occupe » sans résultat

*(Travail agent parallèle sur helm-v1, reporté conceptuellement sur helm-v2.)*

---

## 7. Admin voix

- Bandeau **stack active** : STT, TTS, karaoké, `TTS_PROVIDER`
- Distinction voix **en base** vs **active chat** (`voiceSelectionState()`)
- Alerte si voix Cartesia en DB mais TTS = Deepgram (karaoké off)

**Fichiers :** `server/lib/ttsProvider.js`, `src/pages/admin/AdminVoices.jsx`

---

## 8. Infra & deploy

```bash
cd /apps/helm-v2/app
npm run deploy          # build + PM2 api + vite
npm run deploy:front    # front seulement
npm run deploy:api      # API seulement
```

| Service | Port |
|---------|------|
| Vite | 7923 |
| API | 7926 |
| cursor bridge | 4310 |
| claude bridge | 4320 |

**Bridge asus :** sync SSH parfois indisponible depuis h1 (VPN) → fallback browse SSH côté serveur helm.

---

## 9. Tests existants

```bash
cd /apps/helm-v2/app && npm test
```

Couverture notable : `runStream.test.js`, `sessionPresentation.test.js`, `voiceCursorLoop.test.js`, `workspaceTemplates.test.js`

---

## 10. Non fait / à surveiller

- [ ] Commit git (seulement sur demande humaine)
- [ ] Sync bridge asus `/api/fs/list` quand VPN OK
- [ ] Auth réelle + magic links (VISION phase 2)
- [ ] Docker / packaging (plus tard)
- [ ] 4 tests e2e `demo.spec.js` en échec (agent-demo.xavdp.pro) — bootstrap demo mode absent + scoping conversation Ivonne. Préexistant, pas causé par le travail ci-dessous. Voir section 11.
- [ ] Livrables (Word/PDF/images) — convention dossier `out/` + pandoc/LibreOffice headless + panneau UI téléchargement
- [ ] Vocabulaire mode simple : remplacer les libellés techniques restants (nom de modèle, noms d'outils bruts) par du langage humain quand `viewFilters` = non-admin
- [ ] Retirer complètement `persistTimeline` côté front (refactor `useSessionPresentation`) — aujourd'hui filet de sécurité, le serveur gagne déjà tous les conflits
- [ ] Timelines en MariaDB (actuellement fichiers JSON `data/timelines/`)

---

## 11. Timeline serveur (contrat run_id) + voix infra + mode simple (23 juillet 2026)

Porté depuis une session de refonte sur helm-v1, adapté à l'architecture multi-bridge de helm-v2 (cursor + claude + machines asus/acer).

### Contrat d'événements bridge (cursor :4310, claude :4320)

Chaque run a un `run_id` unique ; tous ses événements portent `run_id` + `seq`, stampés **centralement** dans `broadcast()` des deux bridges (`liveRuns` par conversation) — aucun site d'émission individuel à maintenir. `GET /api/events?conversation=X` filtre : un navigateur ne reçoit que ses propres événements (cloisonnement multi-utilisateur).

**Fichiers :** `/opt/bridge/cursor/server.mjs`, `/opt/bridge/claude/server.mjs`

### Timeline serveur — source de vérité

Le serveur Express construit et persiste la timeline (`server/lib/timelineBuilder.js`), pas le navigateur. Une connexion SSE par source unique (nœuds CLI + plugins agent, dédupliqués par URL) — 4 sources actives : gbs-h1, asus, acer, claude. Routage des événements par registre global `run_id → chemin conversation` (rempli à l'inject), avec repli `machine/user/nom`. Les événements d'un run périmé sont **rejetés déterministement**, pas par heuristique.

Les tours (texte, vocal avec ack Groq, édition/renvoi) sont écrits par le serveur **avant** l'appel au bridge, avec les mêmes ids que l'affichage local (`humanId`/`runId` passés par le front). `sessionOrchestrator` (prime/clear) intégré au builder via `adoptPendingRun`/`linkBridgeRun`. Le store v2 verrouille les écritures non explicites (anti-onglet-périmé) — le builder écrit en `force: true` (autorité serveur).

Front : auto-save du stream supprimé côté navigateur ; convergence par relecture de la timeline serveur ~1,2 s après `response_complete`/`run_complete`.

**Fichiers :**

| Fichier | Rôle |
|---------|------|
| `server/lib/timelineBuilder.js` | Consommateur SSE multi-sources + persistance + rejet runs périmés |
| `server/routes/inject.js` | Écrit human/voice_ack/run (`turn`) ou tronque+réécrit (`resend`) avant d'appeler le bridge |
| `server/lib/sessionOrchestrator.js` | `adoptPendingRun`/`linkBridgeRun` sur prime/clear |
| `server/routes/session.js`, `server/routes/timeline.js`, `server/routes/events.js` | Invalidation cache, filtre SSE par conversation |
| `src/lib/runStream.js` | `pushHuman`/`prepareResendFromHuman` acceptent des ids fournis (`opts.humanId`/`opts.runId`) |
| `src/pages/Dashboard.jsx` | Tours envoyés avec `turn`/`resend`, plus d'auto-save stream, pull serveur en fin de run |
| `server/lib/timelineBuilder.test.js` | 9 tests (contrat run_id, rejet périmés, resend, prime, échec) |

Doc détaillée : [`TIMELINE-SYNC.md`](./TIMELINE-SYNC.md)

### Voix — noms de machines (lexique, correcteur, alias, écho)

Problème résolu : le STT phonétise les noms d'infra (« k0 » entendu « cas0 »). Lexique auto-découvert (nœuds CLI + `~/.ssh/config` du user courant + table `voice_aliases`), boosté en `keyterm` Deepgram. Correcteur post-STT déterministe (`server/lib/voiceNormalize.js`) : alias exact/phonétique, repli canonique, fuzzy borné aux fenêtres avec chiffre/tiret, OTAN auto (≥2 mots), épellation sur marqueur (« épelle golf bravo... »). Écho vocal des noms résolus dans l'accusé Groq (« Bien reçu — gbs-p7 et gbs-k0. »). Admin : **`/admin/voice-aliases`** (CRUD table `voice_aliases`).

**Fichiers :** `server/lib/voiceLexicon.js`, `server/lib/voiceNormalize.js` (+ `.test.js`, 13 tests), `server/lib/voiceAliasStore.js`, `src/pages/admin/AdminVoiceAliases.jsx`, ajout `buildEntityAck` dans `server/lib/groqAck.js`.

Doc détaillée : [`VOICE-NAMES.md`](./VOICE-NAMES.md)

### Mode simple (utilisateur lambda)

`loadViewFilters(role)` dans `src/lib/viewFilters.js` : sans choix explicite en localStorage, un utilisateur **non-admin démarre en « Réponse seule »** (réflexion/outils/terminal/logs masqués — conversation propre, pas un cockpit). L'admin voit tout par défaut. Un choix manuel gagne toujours, dans les deux sens.

### nosav

`node_modules` de l'app (167 Mo), `.venv` + `node_modules` du bridge claude (522 Mo) déplacés vers `/apps/helm-v2/nosav/` avec liens symboliques — hors des backups `tb`.

### Tests

```bash
cd /apps/helm-v2/app && npm test          # 133/133
bash scripts/test-e2e.sh --project=setup --project=public --project=authenticated   # 38/38
```

---

## 12. Livrables, accusé Groq contextuel, mode lambda, tests demo (23 juillet 2026, suite)

### Tests e2e demo réparés
Les 4 tests `demo.spec.js` échouaient car le projet Playwright `demo` héritait de `PLAYWRIGHT_BASE_URL=helm2.xavdp.pro` (production) au lieu de cibler agent-demo. Variable dédiée `PLAYWRIGHT_DEMO_BASE_URL` (défaut `agent-demo.xavdp.pro`). **8/8 demo OK.** (`playwright.config.js`)

### Panneau Livrables (Word/PDF/images)
Nouveau panneau repliable sous le header : liste les fichiers produits par l'agent dans `docs/`, `assets/`, `data/` (convention briefing), avec téléchargement direct. Local + SSH (machines distantes). Dossiers internes exclus (`timelines`, `node_modules`, …). Se rafraîchit à la fin de chaque run.

| Fichier | Rôle |
|---------|------|
| `server/lib/workspaceFiles.js` | `listDeliverables()` (local + SSH `find`), exclusions internes |
| `server/routes/workspace.js` | `GET /workspace/deliverables` + `?download=1` (Content-Disposition attachment) |
| `src/components/DeliverablesPanel.jsx` | Panneau UI i18n (fr/es/en) |
| `src/api/client.js` | `getDeliverables`, `deliverableDownloadUrl` |

### Accusé Groq contextuel (non robotique) + non-répétition Cursor
`isValidAckText` n'impose plus une liste blanche d'ouvertures (elle rejetait de bons accusés contextuels → repli générique robotique). Seuls les garde-fous négatifs restent (pas de « ? », pas de résultat/chiffres, pas de backend, ≤ 22 mots). Avec `GROQ_ACK_LLM=1`, l'accusé reformule l'action et le sujet (« je te prépare une image de bateau… », « je monte le rapport PDF des ventes trimestrielles »). L'agent Cursor reçoit `CURSOR_VOICE_SKIP_ACK` + l'accusé exact (« NE le réécris PAS ») donc ne le répète jamais. (`server/lib/groqAck.js`, `server/lib/locale.js`)

### Mode simple utilisateur lambda (suite)
Pour un non-admin : le header montre seulement le nom de session (pas `machine/user/chemin`) et le nom du modèle (« Composer 2.5 ») est masqué. (`src/pages/Dashboard.jsx`)

### Tests
`npm test` 133/133 · e2e 8/8 demo + authenticated. Panneau livrables vérifié au navigateur (Playwright).

---

## 13. Timelines en MariaDB (23 juillet 2026, suite)

Le stockage des timelines passe des fichiers JSON à une table MariaDB `timelines`
(règle « mysql2 uniquement »). `timelineStore` devient **async**, schéma créé au
boot (`ensureTimelineSchema`). **Migration transparente** : au premier accès d'une
conversation sans ligne DB, l'ancien `data/timelines/<hash>.json` est importé
automatiquement. `updated_at` reste une chaîne ISO (verrou optimiste inchangé).
Propagation `await` : `timelineBuilder`, `sessionOrchestrator`, routes
`inject`/`session`/`timeline`/`conversations`. Cache mémoire du builder conservé
pour l'ordre des événements ; consommateur SSE `await` chaque événement.

`npm test` 134/134 (test builder async sur MariaDB, teardown du pool) · e2e 46/46 ·
import JSON→DB vérifié sur conversations réelles. Voir [`TIMELINE-SYNC.md`](./TIMELINE-SYNC.md).

---

## 14. Front : fin des écritures client de timeline (23 juillet 2026, suite)

`persistTimeline` devient un no-op : le serveur (builder + orchestrator + routes)
est désormais **seul écrivain** et diffuse `timeline_sync` à chaque écriture. Le
front affiche en mémoire et converge par relecture. Import `saveTimeline` retiré
de `Dashboard.jsx`. Vérifié au navigateur (Playwright) : envoi d'un message →
rechargement de la page → historique intact, **0 `PUT /api/timeline`** côté client,
aucune erreur console. e2e 46/46. Termine l'inversion « source de vérité serveur ».

---

## Historique sessions Cursor (juillet 2026)

| Date | Agent / session | Sujet |
|------|-----------------|-------|
| 16–17 jul | 5e16752c… | Voix chat, bridge, Groq, karaoké, rebranding KovZu |
| 20 jul | b6a9c657… | Demo Parloa, guests demo, emails |
| 21 jul | ae6b430b… | Admin voix, livrables, karaoké vs markdown |
| 21 jul | (session courante) | Stepper, Reborn, double voix, présentation auto, scroll, titres CURSOR |
| 23 jul | Claude Code (helm-v1 → v2) | Contrat run_id, timeline serveur multi-bridge, voix noms de machines, mode simple lambda, nosav — voir section 11 |
