# Session du 23 juillet 2026 — notes & décisions (Xavier)

Journal des demandes, décisions et de la vision exprimée par Xavier durant la
session. Sert de mémoire pour les agents qui reprennent.

## Cible & règle de travail

- **Travail actif = helm-v2** (`/apps/helm-v2/app`, https://helm2.xavdp.pro). helm-v1 reste en place mais n'est plus le chantier principal. Tout ce qui a été fait sur helm-v1 doit être porté sur helm-v2 : « amélioration, correction, analyse, projections ».
- **Objectif produit** : que helm-v2 (KovZu) soit **fluide pour un utilisateur lambda** — un dirigeant/opérateur pilote des agents depuis une page web (desktop, tablette, mobile), à la voix, et ça enchaîne parfaitement.
- **Commit + push à chaque paquet de modifications** (demande explicite du 23/07).
- Secrets : `.env` gitignored — ne jamais committer les clés.

## Vision produit rappelée par Xavier

Trois fonctionnalités primordiales de l'outil :
1. **Interroger les outils/données en place** en langage naturel (ex. « quel est le chiffre d'affaires de la semaine ? ») — l'agent va chercher l'info et **agit** même si rien n'a été codé pour ça (il improvise, il lève le doute). Topologie **variable selon le client** (un CRM, une base, etc.). Ce comportement génératif est primordial : mettre l'outil dans les mains d'un dirigeant pour piloter son activité.
2. **Coder à la demande les fonctionnalités manquantes** (vibe-coding) : le gars dans sa voiture demande, l'agent (Composer 95 % des cas, très peu cher ; sinon GPT 5.5/5.6, Claude Opus 4.8, Fable 5 pour les cas complexes) comprend et fait avec quasi-certitude.
3. **Télécommande d'infrastructure** : VPN WireGuard partout entre conteneurs, pilotage via `.ssh/config` + clé SSH. Exemple vécu : dupliquer un conteneur + charger un client VPN + vérifier, en vibe-codant depuis la rue, sans être devant un ordi.

Autres principes :
- L'affichage IDE (réflexion, outils, logs, terminaux) doit être **optionnel** : l'utilisateur lambda n'a pas besoin de tout voir ; le geek expérimenté (Xavier) veut tout voir pour reprendre/diriger l'IA.
- Multi-CLI à terme (Cursor, Claude, Ollama, Kimi, Gemini…) car les CLI ont des aptitudes différentes. La **mémoire projet** (court/moyen/long terme) doit être opérationnelle.
- Le « reborn » = repartir de zéro avec un contexte de départ que Xavier a défini (pas la reprise de session que le CLI gère seul). On peut créer un cursor-agent ailleurs avec un contexte de départ très différent.

## Ce qui a été livré cette session (helm-v2, sauf mention)

1. **Timeline serveur (contrat run_id/seq)** — bridges cursor+claude estampillent run_id/seq ; SSE filtré par conversation ; `timelineBuilder` multi-sources (gbs-h1/asus/acer + claude) construit et possède la timeline ; rejet déterministe des runs périmés.
2. **Correcteur vocal des noms de machines** — lexique auto (nœuds CLI + `.ssh/config` du user app + alias DB), boost Deepgram, correcteur post-STT (alias/phonétique/OTAN/épellation), écho des noms résolus dans l'accusé, page `/admin/voice-aliases`.
3. **Mode simple utilisateur lambda** — non-admin démarre en « Réponse seule » ; header épuré (nom de session seul, modèle masqué).
4. **Tests e2e demo réparés** (baseURL dédiée) — 8/8.
5. **Panneau Livrables** — liste docs/assets/data (local + SSH), téléchargement direct.
6. **Accusé Groq contextuel non-robotique** — validation assouplie ; l'agent Cursor ne répète jamais l'accusé.
7. **Timelines en MariaDB** — table `timelines`, store async, import auto des JSON legacy.
8. **Front : fin des écritures client** — le serveur est seul écrivain (vérifié : 0 `PUT /api/timeline`).
9. **Mailjet** — relais SMTP (clé/secret = auth SMTP), expéditeur `contact@xavdp.pro` (⚠ Xavier avait écrit « contat@ » — supposé faute de frappe, à confirmer ; domaine à valider chez Mailjet).
10. **Upload de documents** — trombone dans le composer : images + PDF/docx/xlsx/csv/txt/… ; aperçu en puce ; l'agent reçoit une directive d'ingestion (extraction PDF/Word/Excel, installe ce qu'il faut).
11. **nosav** — node_modules + venvs hors backups (helm-v1, helm-v2).
12. **Panneau droit (canvas) desktop** — onglets Aperçu (proxy preview même origine
    `/api/preview/<id>`, sélecteur projet turbinobash, bouton « Espace tb ») /
    Debug / Navigateur (POC conteneurs docker, Neko lancé + auto-login URL + rebuild).
13. **Skills agent enrichis (contexte)** — API d'abord puis navigateur en dernier
    recours ; orchestration maître→subalternes ; planification cron/systemd/maison ;
    routage modèle ; reborn ; **non-sudo dans l'app mais root SSH sur l'hôte du
    conteneur** (mains libres pour façonner son univers).
14. **Orchestrateur** — app tb `kovzu-orchestrator-v1` créée (noweb+MariaDB) ;
    architecture queue+planif+auto-correction posée (code à venir).
15. **Tests** — `npm run test:chat` (unit + e2e chat complet) + hook pre-push qui
    bloque un push si rouge.
16. **Karaoké corrigé** — ne casse plus le rendu riche (bande au-dessus, markdown gardé).

## Demandes récentes (journal — à tenir à jour)

- Accusé Groq contextuel non-robotique + l'agent Cursor ne le répète pas. ✅
- Upload de documents (trombone) + pipeline d'ingestion côté agent. ✅
- Canvas desktop multi-onglets (Aperçu/Debug/Navigateur) + création espace tb. ✅
- Navigateur de tous les jours = Chrome à sessions persistées ; rebuild + login/pass dans l'URL. ✅ (login URL) / persistance sessions : à finir
- **API d'abord**, navigateur seulement si pas d'API. ✅ (contexte)
- Orchestration dynamique : maître→subalternes, planification, routage, reborn — **dans le contexte**. ✅
- Système de **queue + planification** en app tb, dispatch via API IP-VPN/user/chemin, feedback complet, auto-correction (jamais 2× la même erreur). ✅ plan + app créée / code à venir
- Agent **non-sudo dans l'app mais root SSH sur l'hôte** du conteneur (mains libres). ✅ (contexte)
- Tester le chat à chaque modif (`test:chat` + hook). ✅
- Karaoké qui casse le formatage → corrigé. ✅
- **Panneau droit AUSSI en mobile** (overlay plein écran) — noté, à faire.
- Concrétiser Shaper (cockpit pilotable, clef en main pour dirigeant). fil rouge.

## vision0 / gbs-p2 — exploration (aucun code, à la demande de Xavier)

vision0 est sur **gbs-p2** (VPN serveur sur gbs-vps). Constaté par SSH depuis gbs-h1 :
- Un **bureau XFCE** tourne (display :11, user zaza) accessible en remote (xrdp/pulseaudio-xrdp) — le « bureau ».
- Un **cursor-agent worker** (agent Cursor de fond) + bridges cursor (helm-v2, cursorauto, helm-v1) tournent localement.
- Des **automatisations Playwright** headless scrapent le portail OVH (factures/PDF via `subscriptionPortals`) — le contrôleur « scraper data ».
- Home zaza : AUTOPILOT, BIGREMOTE, CURSOR, cursor-bridge, Cursor-Autopilot.desktop, Cursor-Remote.desktop — les « contrôleurs ».

Concept Xavier : un **bureau + contrôleurs**, chacun un agent CLI local (Xavier/moi/Cursor) ; on demande au Cursor CLI d'agir sur le bureau, un autre voit le navigateur (debug), un autre scrappe les data. Avis à donner (voir réponse chat). **Ne rien coder dans ce sens pour le moment.**

## Canvas / panneau droit — vision Xavier (23/07, à construire plus tard)

Panneau à **droite en mode desktop uniquement** (caché sur mobile pour l'instant),
affichable/masquable, avec **plusieurs onglets** façon Lovable :
1. **Preview live** de l'app vibe-codée (CRM ou n'importe quel outil) dans un iframe
   connecté au serveur de dev en cours — **sans changer l'URL** (helm2.xavdp.pro).
   Idéal : vibe-coder les fonctionnalités du CRM (crmxavdp-v1, crmdemo-v1) ou tout
   outil via le Cursor CLI et voir/tester à droite en direct.
2. **Navigateur de debug** (podman/Neko) — Neko = navigateur WebRTC qui s'affiche ;
   fait passer le son (parfois primordial, parfois non). Question ouverte : Neko ou mieux ?
3. **Navigateur quotidien connecté** — pour que l'agent agisse sur les pages web
   (webmail, LinkedIn, Facebook shop…) ou récupère des infos, avec les sessions loggées.

Contraintes techniques relevées :
- Token Cloudflare : **pas dans le .env**. Le tunnel tourne via `cloudflared tunnel run --token …`
  (tunnel géré à distance, ingress dans le dashboard CF). → pour la preview, PAS besoin de
  Cloudflare : un reverse-proxy interne helm-v2 (`/preview/<projet>` → port dev local) garde
  tout sous helm2.xavdp.pro, même origine.
- Neko pas encore installé. vision0/gbs-p2 utilise déjà XFCE+xrdp (desktop) + Playwright.

Reco (voir chat) : preview = reverse-proxy interne (le plus sûr, zéro Cloudflare) ;
debug agent = Playwright/CDP screencast (léger, intégré) ; navigateur quotidien avec son = Neko.

## Reste à faire (ordre indicatif)

- **Canvas / panneau droit multi-onglets** (preview + navigateurs) — voir section ci-dessus. Desktop only.
- Bases solides côté préparation du Cursor CLI : « CLI à poil » (installé minimal), qui selon le besoin enregistre/réutilise dans son **contexte** des skills/méthodes connues qui marchent (ex. pipeline PDF, docx), et **improvise** si ce n'est pas dans son contexte. Objectif : lui donner des bases fiables + lui expliquer qu'il cherche dans son contexte ou improvise pour atteindre le but.
- Auth réelle + magic links (VISION phase 2).
- Recherche dans les conversations ; mémoire inter-conversations.
