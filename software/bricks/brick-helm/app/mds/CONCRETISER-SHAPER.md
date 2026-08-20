# Concrétiser Shaper avec KovZu

Synthèse de la direction produit (23 juillet 2026). KovZu (helm-v2) est la
**concrétisation technique de Shaper** (shaper.xavdp.pro).

## Shaper — le positionnement (rappel)

Xavier = **façonneur d'outils métier**. « Humain d'abord · puis la technique ».
Cible : **dirigeants de PME/startups qui connaissent leur métier mais pas
l'informatique** (« Je ne suis pas informaticien », « pas de formulaire à
remplir »). Promesse : un **socle pilotable** — un cockpit unifié (pas un
patchwork), des **agents métier branchés au socle** (pas un chatbot générique),
qui élimine les tâches répétitives. Déploiement cloud / hybride / on-premise.
Maturité : discuter → façonner le socle → broder (itérer).

## KovZu = le socle pilotable rendu réel

Ce qu'on construit doit faire dire à un dirigeant : **« il fait vraiment mon
travail »**, et à Xavier : **« on donne un vrai outil clef en main pour piloter
son activité »**.

### Principe directeur d'accès aux données/actions (ordre imposé à l'agent)

1. **API d'abord.** L'agent CLI CHERCHE une API (officielle, interne, endpoint
   privé d'un portail), la documente, et **passe par l'API si elle existe**
   (token/clé) — plus fiable, plus rapide, sans fragilité d'UI.
2. **Navigateur de tous les jours en DERNIER recours**, seulement si aucune API :
   un **Chrome à sessions persistées** (login/mot de passe gardés ; sinon
   ressaisis une fois) pour agir sur webmail, portails, factures, LinkedIn…
   et récupérer le vrai fichier.

(Encodé dans `server/lib/agentSkills.js`, injecté au prime + rappelé à chaque tour.)

### Ce qui rend l'outil bluffant et clef en main

| # | Levier | Effet dirigeant |
|---|--------|-----------------|
| 1 | **Voir l'agent agir** sur ses vrais outils, **narré à voix haute** | « il fait mon travail sous mes yeux » |
| 2 | **Co-pilote** : l'agent agit, le dirigeant reprend la main (2FA, choix) | enlève la peur du blocage |
| 3 | **Sessions déjà connectées** (persistées, chiffrées) — jamais de re-login | « clef en main » |
| 4 | **Onboarding par la conversation** (pas de formulaire) — l'agent discute des irritants et construit le socle | fidèle à l'étape 1 de Shaper |
| 5 | **« Si ça revient → ça devient un bouton »** : chaque récurrence = capacité sauvegardée (broderie) | le socle grandit, l'outil est à lui |
| 6 | **Garde-fous** : confirmation avant action sensible (payer/envoyer/supprimer) | confiance pour déléguer |
| 7 | **Voix + un seul écran cockpit**, livrables téléchargeables | zéro jargon, utilisable de suite |

### Le panneau droit (canvas) — les 3 vues

- **Aperçu** : vibe-code d'un outil métier (CRM…) visible en direct (proxy interne,
  même URL). Le dirigeant voit son outil se construire.
- **Debug** : la vue où l'agent agit et où on reprend la main.
- **Navigateur** : le Chrome de tous les jours (sessions connectées) — quand il
  n'y a pas d'API.

## État technique (fait / à finir)

**Fait :** socle serveur (timeline autorité serveur, MariaDB), voix contextuelle,
livrables téléchargeables, upload de documents, skills agent (API-first inclus),
panneau droit 3 onglets, POC conteneurs docker (Neko lancé + auto-login URL).

**À finir pour le « waouh » distant :**
- **Neko TCP-mux** : rendre la vidéo du navigateur/bureau visible à travers le
  tunnel Cloudflare (aujourd'hui l'UI se charge, le flux vidéo non).
- **Narration voix** pendant que l'agent agit.
- **Reprise de main** exposée dans l'onglet.
- **Sessions persistées** par service (chiffrées) pour le Chrome quotidien.
- **Garde-fous** de confirmation sur actions sensibles.

## En une phrase

**KovZu = le socle pilotable de Shaper : un cockpit voix + un panneau qui montre
l'agent agir (API d'abord, navigateur connecté sinon), où chaque tâche récurrente
devient une capacité — l'outil métier clef en main du dirigeant.**
