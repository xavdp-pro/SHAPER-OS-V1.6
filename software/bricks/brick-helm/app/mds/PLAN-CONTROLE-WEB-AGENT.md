# Plan — un agent pilote/débogue un site web authentifié (extension vs « par dessous »)

**Type :** plan + checklists + décision d'architecture (rien codé ici).
**Portée :** KovZu (helm-v2) — laisser un agent CLI **naviguer, changer les URLs,
agir et déboguer (JS/DOM)** sur un site où un utilisateur est authentifié.
**Home futur :** `helm-v2/app/mds/` (hub actif).

Origine : demandes de la session — « contrôler le navigateur/bureau via la vue »,
« un Chrome de tous les jours qui garde les logins », « API d'abord, browser en
dernier recours », « l'utilisateur regarde l'agent agir et est bluffé ».

---

## 0. La question posée (deux volets)

1. **Piloter** un site authentifié (changer les URLs, cliquer, agir, extraire).
2. **Déboguer** le JS/DOM d'un site.

Pour les deux : **extension Chrome** ou **« passer par dessous »** ?

---

## 1. Réponse courte

> **Par dessous** (piloter un Chrome côté serveur via **CDP**) est le défaut,
> pour piloter **comme** pour déboguer. L'**extension** n'est justifiée que dans
> **un** cas précis (§4). Et pour une app **construite avec KovZu**, souvent
> **ni l'un ni l'autre** : on passe par son **API/DB** (API-first).

Pourquoi : une extension qui inspecte le DOM/JS utilise `chrome.debugger`, qui
**enveloppe CDP**. Piloter CDP en direct (Playwright / puppeteer / CDP brut)
donne **tout** ce qu'une extension devtools donne — DOM, console, réseau,
évaluation JS, breakpoints, observation des mutations — **plus** le pilotage
serveur, parallèle, planifiable, et sans installation par utilisateur.

---

## 1 bis. Recommandation par défaut (Phase 0) — le « comme Cursor », sans frottement

> **Décidé (24/07/2026).** Pour le cas le plus courant — **déboguer une app web
> en développement, en collaboration directe avec la personne** — le défaut est
> **l'option 1 : Neko + CDP affiché dans le panneau KovZu**. Zéro installation
> côté utilisateur. Options 2 et 3 = fallbacks explicites.

**Pourquoi ce modèle.** Le browser intégré de **Cursor** n'est ni une extension
ni le Chrome quotidien de l'utilisateur : Cursor **lance son propre Chromium** et
le pilote en **CDP** (l'agent lit console/DOM/réseau + screenshots, l'humain voit
la même vue). C'est frictionless *parce que* c'est un navigateur que l'outil
contrôle. Pour **déboguer une app en dev** on n'a **pas besoin** des vrais logins
de l'utilisateur → donc pas de son vrai navigateur → donc **pas d'extension**.

**Caveat structurel.** Cursor est une app **locale** (desktop) → son navigateur
local est « gratuit ». KovZu est **cloud** (helm2.xavdp.pro) : une page web ne
peut pas lancer un Chrome sur la machine de l'utilisateur (sandbox). D'où le
classement ci-dessous — « vraiment local » a un coût d'installation.

| Rang | Approche | Frottement user | Local ? | Cas d'usage |
|------|----------|-----------------|---------|-------------|
| **1 (défaut)** | **Neko + CDP dans le panneau** | **zéro install** | non (cloud, streamé WebRTC) | **déboguer une app web / dev — le cas « comme Cursor »** |
| 2 (fallback) | **Compagnon local** (binaire qui lance Chrome `--remote-debugging-port` + tunnel sortant) | install unique | **oui, vraiment local** | débogage sur la machine/LAN de la personne, faible latence, ou ses vraies sessions |
| 3 (fallback) | **Extension Chrome** (`chrome.debugger` + relais WSS) | install + permission `debugger` + MV3 | oui, son Chrome quotidien | **seulement** si besoin de ses **onglets réels de tous les jours** |

**Conséquence concrète :** on construit l'option 1 en premier (elle est déjà la
plus avancée dans le code : Neko + Playwright présents). L'option 2 n'est ouverte
que si un besoin « vraiment sur sa machine » apparaît ; l'option 3 seulement pour
le cas §4. Détail technique de l'unification Neko+CDP en §5.

---

## 2. D'abord : séparer deux scénarios (souvent confondus)

| Scénario | Ce qu'on a | Meilleure approche |
|---|---|---|
| **A. App construite AVEC KovZu** (SaaS/CRM à nous) | code source, API, DB | **API/DB direct** — pas de navigateur. « Changer l'URL » = l'agent pilote l'app via son backend. Voir `preview.js` (reverse-proxy same-origin déjà en place). |
| **B. Site tiers authentifié** (LinkedIn, Gmail, CRM externe sans API suffisante) | seulement une session navigateur | **Par dessous** : Chrome serveur à profil persistant, piloté CDP, regardable via Neko. |

> Règle API-first (déjà dans le contexte agent) : chercher l'API **avant** le
> navigateur. Le navigateur piloté = dernier recours, pour le scénario B.

---

## 3. Les 3 approches techniques comparées

### A. Extension Chrome
- **+** tourne dans le **vrai** navigateur de l'utilisateur (ses cookies, son
  SSO/2FA déjà faits) ; content scripts pour lire/modifier le DOM ; `chrome.tabs`,
  `chrome.scripting`, `chrome.debugger`.
- **−** install + permissions par utilisateur ; contraintes Manifest V3
  (service worker éphémère, pas de code distant arbitraire) ; **pilotage serveur
  difficile** (besoin d'un canal native-messaging/WebSocket vers l'extension) ;
  pas de headless ni de parallèle ; casse aux mises à jour Chrome ; rien ne
  tourne quand le navigateur est fermé.
- **Sécurité** : agit avec l'**identité complète** de l'utilisateur — puissant
  et dangereux, à scoper très serré.

### B. « Par dessous » — Chrome serveur piloté CDP (recommandé)
- Un Chromium tourne côté serveur (déjà : conteneur **Neko**), piloté par
  **CDP/Playwright**. Profil **persistant** ⇒ garde les logins (le besoin
  « Chrome qui garde les sessions »). Streamé en **WebRTC** ⇒ l'utilisateur
  **regarde** l'agent agir (le « bluffer »).
- **+** pilotage 100 % programmatique (naviguer, changer l'URL, cliquer,
  extraire) ; **débogage complet** (DOM, console, réseau, éval JS, breakpoints,
  **interception/réécriture des requêtes** = littéralement « changer les URLs par
  dessous ») ; headless, parallèle, planifiable (→ maestro-v1) ; **aucune install**
  côté utilisateur.
- **−** les sessions vivent **côté serveur** (dans le profil du conteneur) : il
  faut se logguer **une fois** dedans (ou importer les cookies) ; le premier
  SSO/2FA se fait dans ce navigateur-là ; certains sites détectent l'automation.
- **Sécurité** : sessions stockées côté serveur ⇒ à protéger — **lien direct
  avec le plan `vault-v1`** (cf. `PLAN-VAULT-V1.md`).

### C. Reverse-proxy / MITM (le plus « par dessous »)
- Router le trafic via un proxy KovZu, réécrire au niveau HTTP (ce que fait déjà
  `preview.js` pour les URLs racine-absolues).
- **+** transparent, sans dépendance navigateur ; réécrit URLs/injections.
- **−** interception TLS invasive et fragile ; cookies d'auth liés aux vrais
  domaines cassent ; CSP/CORS pénibles ; ce n'est pas « contrôler », juste
  réécrire. **Bon pour l'aperçu d'app à nous, mauvais pour piloter un tiers.**

---

## 4. Le seul cas où l'extension gagne

Quand l'action **doit** se produire dans le **navigateur de l'utilisateur, sur
sa machine, avec son identité** — et ne peut pas migrer côté serveur :

- SSO d'entreprise verrouillé à l'appareil / la 2FA matérielle de l'utilisateur.
- Politique : « la session ne quitte jamais mon poste ».
- Besoin d'agir sur les onglets réels que l'utilisateur a déjà ouverts.

Dans ce cas : extension MV3 minimale + canal (native messaging ou WS local) vers
KovZu, l'agent envoie des ordres CDP via `chrome.debugger`. À traiter comme
**fallback**, pas comme socle.

---

## 5. Architecture recommandée (unifier Neko + CDP)

Idée clé : **un seul Chrome**, que l'utilisateur **regarde** (Neko WebRTC) et que
l'agent **pilote** (CDP) — pas deux navigateurs.

```
   agent CLI (sub)                       utilisateur (regarde)
        │  ordres CDP                            ▲ WebRTC (Neko)
        ▼                                        │
  ┌──────────────────────────────────────────────────────┐
  │  conteneur Neko/Chromium                               │
  │  Chromium --remote-debugging-port=9222                 │
  │  profil PERSISTANT (user-data-dir monté = logins gardés)│
  └──────────────────────────────────────────────────────┘
        ▲ helm-v2 : browserContainers.js / routes/browser.js (déjà là)
        ▲ sessions/cookies protégés ← vault-v1 (à venir)
```

État réel vérifié (24/07) :
- ✅ `server/lib/browserContainers.js` + `routes/browser.js` : lancent/rebuild
  Neko (`ghcr.io/m1k1o/neko/chromium`), autologin via `NEKO_PASSWORD`.
- ✅ Playwright déjà dépendance (`@playwright/test`, `playwright install chromium`).
- ❌ **Pas encore** de profil persistant (`user-data-dir`) → logins **non gardés**.
- ❌ **Pas encore** de port CDP exposé (`--remote-debugging-port`) → agent ne
  pilote pas encore le Chrome de Neko.
- ✅ `preview.js` : reverse-proxy same-origin + réécriture d'URL (scénario A/C).

---

## 6. Plan par phases + checklists

### Phase 0 — Décisions (tranchées le 24/07/2026, cf. §1 bis)
- [x] **Défaut = option 1 : Neko + CDP dans le panneau** (« comme Cursor », zéro install)
- [x] Option 2 (compagnon local) = fallback « vraiment sur sa machine »
- [x] Option 3 (extension) = fallback §4 seulement (ses onglets réels quotidiens)
- [x] Scénario A (app KovZu) → **API/DB**, pas de navigateur
- [x] Un seul Chrome (Neko streamé + CDP piloté), pas deux

### Phase 1 — Chrome persistant + port CDP (socle scénario B)
- [ ] Monter un `user-data-dir` persistant dans le conteneur Neko (par
      utilisateur/espace) → **les logins survivent** aux redémarrages
- [ ] Lancer le Chromium de Neko avec `--remote-debugging-port=9222` (bind
      **loopback conteneur uniquement**, jamais exposé au réseau)
- [ ] Depuis helm-v2 : se connecter en CDP (Playwright `connectOverCDP`)
- [ ] Test : l'agent ouvre une URL, l'utilisateur la voit changer dans la vue Neko

### Phase 2 — Login-once + persistance de session
- [ ] Flux « connecte-toi une fois » : l'utilisateur se loggue dans la vue Neko,
      la session reste dans le profil persistant
- [ ] Alternative : import de cookies (export navigateur → injection CDP
      `Network.setCookies`) — pour éviter de retaper les identifiants
- [ ] **Protéger le profil/cookies** via `vault-v1` (ne jamais laisser en clair
      sur disque non chiffré) — cf. `PLAN-VAULT-V1.md`
- [ ] Jamais de mot de passe/cookie dans un contexte destiné au LLM (noms seuls)

### Phase 3 — Pilotage (scénario B)
- [ ] Primitives agent : `goto(url)`, `click(sel)`, `type`, `waitFor`,
      `extract(sel)`, `screenshot` (via CDP)
- [ ] **Changer les URLs par dessous** : `Fetch`/`Network` domain CDP pour
      intercepter/réécrire requêtes si besoin (pas juste `goto`)
- [ ] Garde-fous : allowlist de domaines pilotables par espace/utilisateur
- [ ] L'utilisateur peut **reprendre la main** à tout moment dans la vue Neko

### Phase 4 — Débogage JS/DOM (répond à la 2e question)
- [ ] Console : capter `Runtime.consoleAPICalled` + `Log.entryAdded` → remonter
      erreurs/logs à l'agent
- [ ] DOM : `DOM.getDocument`, `DOM.querySelector`, observer les mutations
- [ ] Évaluer du JS dans la page : `Runtime.evaluate`
- [ ] Réseau : `Network.*` (requêtes/réponses, statuts, timings)
- [ ] Breakpoints/pas-à-pas si nécessaire : `Debugger.*`
- [ ] **Aucune extension requise** — tout ça est du CDP ; documenter que
      `chrome.debugger` (extension) n'apporterait rien de plus ici

### Phase 5 — Orchestration & planification
- [ ] Actions navigateur déclenchables en tâche **maestro-v1** (cron/at/event)
- [ ] Rapport structuré de fin (`RUN-REPORT.md` de maestro-v1) : ce que l'agent
      a fait/vu sur la page
- [ ] Parallélisme : plusieurs conteneurs Neko/profils si besoin

### Phase 6 (optionnel) — Extension fallback §4
- [ ] Décider si un cas réel l'exige (sinon **ne pas construire**)
- [ ] Extension MV3 minimale + native messaging/WS vers KovZu
- [ ] Ordres via `chrome.debugger` (même vocabulaire CDP que Phase 3/4)
- [ ] Même règle secrets (rien en clair côté LLM)

---

## 7. Checklist sécurité (bloquante)

- [ ] Port CDP (`9222`) **jamais** exposé hors du conteneur (loopback only)
- [ ] Sessions/cookies/profil **chiffrés au repos** (via vault-v1)
- [ ] **Allowlist de domaines** par espace : un agent ne pilote pas n'importe quel site
- [ ] Consentement/visibilité : l'utilisateur **voit** l'agent agir (vue Neko) et
      peut reprendre la main / couper
- [ ] Aucun secret (mdp, cookie, token) dans un log ou un contexte LLM (noms seuls)
- [ ] Journaliser les actions navigateur de l'agent (audit — réutiliser maestro/vault)
- [ ] Ne pas piloter un site tiers **sans mandat clair** de l'utilisateur (agir
      « en son nom » = responsabilité forte)

---

## 8. Ordre conseillé

1. **Phase 0** — trancher : CDP par défaut, extension = fallback, app-KovZu = API
2. **Phase 1** — profil persistant + CDP sur le Chrome de Neko (le vrai déblocage)
3. **Phase 2** — login-once + protection des sessions (dépend de vault-v1)
4. **Phase 3 & 4** — piloter + déboguer (même canal CDP, se font ensemble)
5. **Phase 5** — brancher sur maestro-v1 (planifié/parallèle)
6. **Phase 6** — extension **seulement** si un cas §4 réel se présente

---

## 9. TL;DR pour décider vite

- App faite avec KovZu → **API/DB**, pas de navigateur.
- Site tiers authentifié → **Chrome serveur persistant piloté CDP**, regardé via Neko.
- Débuguer JS/DOM → **CDP** (l'extension n'apporte rien de plus, en apporte moins).
- Extension → **uniquement** si l'action doit rester dans le navigateur/appareil/
  identité propre de l'utilisateur (§4).
- Dans tous les cas : sessions **chiffrées (vault-v1)**, actions **auditées**,
  domaines **allowlistés**, utilisateur **témoin et maître** de la reprise en main.

Rien n'est codé : plan et checklists uniquement. À valider (surtout Phase 0).
