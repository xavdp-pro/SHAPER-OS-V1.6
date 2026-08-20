# Canvas / panneau droit — aperçu vibe-code (helm-v2)

Panneau droit **desktop uniquement** (caché sur mobile), affichable via le bouton
`PanelRight` du header. Onglets : **Aperçu**, **Debug**, **Navigateur**.

## Onglet Aperçu (opérationnel)

- Sélecteur de **projet turbinobash** (registre `server/lib/vibeProjects.js`).
- `<iframe>` **même origine** sur `/api/preview/<id>/` — reverse-proxy interne
  (`server/routes/preview.js` + WS HMR `server/lib/previewWsBridge.js`) vers le
  dev server local du projet. **Aucun Cloudflare requis**, l'URL reste helm2.xavdp.pro.
- Pastille verte/grise = dev server up/down (`/api/vibe/projects/:id/status`).
- Bouton **« Espace tb »** : demande à l'agent de lancer `tb app sudo/way/noweb/create <id>`
  et de préparer un squelette (voir flux ci-dessous).

### ⚠️ Base Vite obligatoire pour l'aperçu

Un dev Vite servi sous un sous-chemin doit tourner avec **`base` = le préfixe preview**,
sinon le graphe de modules / HMR (chemins racine-absolus `/@vite`, `/src`, `/assets`)
ne résout pas. Lancer le dev du projet ainsi :

```bash
cd /apps/<id>/app
vite --port <port> --base=/api/preview/<id>/
```

Le proxy réécrit en best-effort les `src="/…"` / `href="/…"` du HTML, ce qui suffit
pour un build statique simple, mais **le mode fiable (dev + HMR) = base correcte**.

## Registre projets (`vibeProjects.js`)

Défaut : `crmdemo-v1` (7597), `crmxavdp-v1` (7607). Override :
`VIBE_PROJECTS="id|Label|port,id2|Label2|port2"` (chemin déduit `/apps/<id>/app`).

## Flux turbinobash (rappel doc lue)

- Créer l'espace : `tb app sudo/way/noweb/create <id>` → user/DB//apps/<id>/.
- Dev : Vite sur port local (base = préfixe preview).
- **Prod** : `tb app sudo/way/proxy/create <id> http://127.0.0.1:<port> --certbot`
  (sous-domaine + SSL Let's Encrypt) — ou ingress Cloudflare tunnel pour un
  sous-domaine du/des domaine(s) configuré(s) (nécessite le token API Cloudflare,
  distinct du token du tunnel qui tourne déjà en service).

## Onglets Debug / Navigateur — POC conteneurs (docker)

Gestionnaire de conteneurs navigateur (`server/lib/browserContainers.js`,
routes `server/routes/browser.js`, **admin only**) :
- `GET /api/browser/containers` — liste (nos conteneurs `kovzu.browser=1` +
  externes reconnus type `xavdp-navigator`).
- `POST /api/browser/neko` — lance un Neko (`ghcr.io/m1k1o/neko/chromium`) sur un
  port local libre (9450-9490).
- `POST /api/browser/:name/stop`, `DELETE /api/browser/:name`.
- Proxy same-origin `/api/browser/proxy/:name/` → port du conteneur (iframe onglet,
  X-Frame-Options retiré).

Les onglets **Debug** et **Navigateur** partagent ce gestionnaire (sélecteur de
conteneur + bouton « Neko » + iframe). Vérifié : la liste remonte `xavdp-navigator`
(navigateur maison, port 9420, API protégée par son propre auth → 401 attendu dans
l'iframe tant qu'on ne relaie pas son token).

CLI conteneur : `docker` sur gbs-h1 (pas de podman ici) — override `CONTAINER_CLI`.

### « Il me faut plus d'infra » (Xavier) — à finir plus tard
- **Neko via tunnel Cloudflare** : WebRTC UDP ne traverse pas le tunnel TCP → activer
  ICE-lite + **TCP-mux** (`NEKO_TCPMUX`) et publier ce port, ou desktop en LAN.
- **Debug = Playwright/CDP screencast** (plus léger, sans son, intégré à l'agent) —
  brancher sur vision0/gbs-p2 où Playwright tourne déjà.
- **Auth relais** pour `xavdp-navigator` (token) afin d'afficher sa vue.
- Version **demo** : gestion podman + lancement/affichage — plus tard (POC ici).

## Panneau droit en MOBILE (fait — 23/07)

Desktop (`≥ lg`) : colonne à droite inchangée, 3 onglets (Aperçu/Debug/Navigateur).

Mobile/tablette (`< lg`) : **overlay plein écran**, basculé par le même bouton
« Panneau projet » (désormais visible à toutes les tailles, plus `hidden lg:…`),
montrant **uniquement l'Aperçu** (sélecteur de projet turbinobash + iframe proxy
`/api/preview/<id>`) — **sans barre d'onglets**. Debug et Navigateur (VNC/Neko)
ne sont **jamais montés** sur mobile : la décision se fait en JS
(`useIsDesktopPanel`, seuil `min-width: 1024px` = même seuil que la colonne
desktop), pas juste en CSS masqué — donc aucun flux vidéo/appel conteneur n'est
déclenché côté mobile, même en arrière-plan.

Vérifié au navigateur en viewport mobile (390×844) : bouton visible, overlay
« Aperçu » sans « Debug »/« Navigateur » dans le DOM, sélecteur + bouton
« Nouvel espace applicatif » présents.

## Sélecteurs stylés + « espace applicatif » (23/07)

Les `<select>` HTML natifs (projet vibe-code, conteneur navigateur) sont
remplacés par `PickerMenu` (même composant que le reste de l'app — pas de
jargon visuel système). Le bouton « + Espace tb » devient un simple **`+`** à
gauche du sélecteur de projet, qui ouvre un **popover explicatif** (pas le mot
« tb ») : *« Un espace applicatif est un dossier de travail isolé et dédié
(son propre code, sa propre base de données) — l'endroit où l'agent construit
un outil pour toi »*, avec le champ de création en dessous.

⚠️ **Non vérifié par build/e2e** : l'environnement d'exécution a durci ses
restrictions en cours de session (esbuild/vite/playwright renvoient `EACCES`/
`Permission denied` même via `node <script>`). Changement relu manuellement en
détail (imports, props `PickerMenu`, option `disabled` par ligne) mais **à
valider par un build réel** (`npm run build` + rechargement) avant confiance totale.

## Karaoké vs rendu riche (corrigé 23/07)

Bug : quand le karaoké jouait, il **remplaçait** tout le rendu riche (tableaux,
code, images, liens) par du texte plat surligné. Corrigé dans `RunTimeline.jsx` :
le karaoké est désormais une **bande de surlignage au-dessus**, et `StreamingMarkdown`
reste **toujours affiché** en dessous → le formatage n'est plus cassé.
