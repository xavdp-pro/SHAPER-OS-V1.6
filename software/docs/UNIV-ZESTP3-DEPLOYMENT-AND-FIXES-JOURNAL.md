# SHAPER OS — Journal d'Intervention & Réalisations sur `univ-zestp3`

> **Classification** : Journal d'architecture et d'opérations (Univers : `univ-zestp3` / `ia-p3.xavdp.pro`)  
> **Date de consolidation** : Août 2026  
> **Auteur** : Human Operator (Xavier) & Autonomous AI Agent (Antigravity)  
> **Dépôt Git** : `xavdp-pro/SHAPER-OS-V1.6`  

---

## 1. Vue d'Ensemble de l'Univers `univ-zestp3`

L'univers `univ-zestp3` constitue l'environnement souverain de référence déployé sur conteneur LXC (`gbs-test` / `univ-zestp3`) hébergeant l'écosystème SHAPER OS complet sous Podman rootless/systemd avec exposition via Cloudflare Tunnel sur `https://ia-p3.xavdp.pro`.

### Topologie des Services Podman déployés
| Service | Conteneur | Port | Périmètre | Rôle |
| :--- | :--- | :--- | :--- | :--- |
| **Vault** | `univ-zestp3-vault` | `8610` | P1 | Chiffrement et distribution souveraine des secrets (`vault.enc`) |
| **Logger** | `univ-zestp3-logger` | `8620` | P1 | Audit trail immuable et logs JSONL centralisés |
| **Bridge OpenCode** | `univ-zestp3-bridge-opencode` | `4440` | P2 | Passerelle CLI OpenCode / LLM avec streaming SSE (`/api/events`) |
| **Queue** | `univ-zestp3-queue` | `8640` | P1 | File de messages et ordonnancement asynchrone |
| **Maestro** | `univ-zestp3-maestro` | `8630` | P2 | Organisme d'arbitrage, battements réguliers et orchestration |
| **Helm v2 (KovZu)** | `univ-zestp3-helm` | `8650` | P2 | Cockpit Web (React 19 + Express 5 + MariaDB) & Voice STT/TTS |
| **Tunnel** | `univ-zestp3-tunnel` | `-` | P1 | Ingress Cloudflare sécurisé vers `https://ia-p3.xavdp.pro` |

---

## 2. Historique Exhaustif des Problèmes Traités et Corrections Apportées

### A. Désynchronisation des Tokens Bridge & Erreurs 401 / 502
* **Symptôme initial** : Les requêtes entre Helm et le Bridge OpenCode échouaient aléatoirement avec des erreurs `HTTP 401 Unauthorized` ou `HTTP 502 Bad Gateway`, masquées silencieusement.
* **Résolution** :
  * Synchronisation forcée et déterministe de `OPENCODE_BRIDGE_TOKEN` dans `podman-up.sh` vers `$UNIV/sav/opencode-bridge/token` et les variables d'environnement de Helm.
  * Remontée stricte et transparente des erreurs 401 dans les suites de tests et l'interface utilisateur.

### B. Fiabilisation du Streaming & Anti-Silence OpenCode
* **Symptôme** : Quand un outil échouait ou que le modèle s'interrompait sans texte final, l'agent restait muet sur `session.idle`, laissant l'interface en attente indéfinie et bloquant le déclenchement vocal.
* **Résolution** :
  * Modification de `translate.mjs` dans `opencode-bridge` pour garantir l'émission d'une réponse textuelle explicite en cas d'erreur ou d'interruption.

### C. Restauration de la Présentation & Briefing ("Reborn")
* **Symptôme** : Lors d'une réinitialisation de session (`Reborn`), la planche de bienvenue de Zephir ne s'affichait plus et il manquait le fichier de contexte système.
* **Résolution** :
  * Implémentation du endpoint `POST /api/session/clear` réinitialisant le chat bridge tout en relançant le briefing d'accueil personnalisé ("Bonjour Xavier ! Je suis Zephir...").
  * Création et réplication dynamique d'un `CONTEXT.md` unique et souverain dans `/data/opencode-ws/_kovzu/CONTEXT.md` et `/data/opencode-ws/Xavier/_kovzu/CONTEXT.md`.
  * Correction du port Maestro dans la table des services (`8630`).

### D. Optimisation Acoustique & Vocalisation Deepgram Aura-2 / Nova-3
* **Symptôme** : Volume sonore faible, voix terne, ou manque de punch sur le playback vocal.
* **Résolution** :
  * Câblage du modèle STT `nova-3` et de la voix TTS française dynamique `aura-2-agathe-fr`.
  * Création du banc d'essai acoustique en boucle fermée `test-voice-player.mjs` validant les métriques sonores (gain dynamique, crête à -7.8 dB, RMS -25.8 dB).

### E. Normalisation TTS Phonétique & Lecture des Acronymes (`ttsFormat.js`)
* **Symptôme** : Les acronymes techniques (`API`, `SQL`, `GED`, `URL`, `SSH`, `CSV`, `PDF`, `JSON`, `TTS`, `STT`, etc.) étaient prononcés comme des mots incompréhensibles ou bafouillés par le moteur TTS. Les blocs de code markdown perturbaient la parole.
* **Résolution** :
  * Création du module `ttsFormat.js` (`formatTextForTts(text, locale)`).
  * Expansion phonétique automatique des acronymes en lettres tiretées (`A-P-I`, `S-Q-L`, `G-E-D`, `C-S-V`, `J-S-O-N`).
  * Nettoyage automatique du markdown (code blocks, tags d'émotion, images) pour le flux audio tout en préservant le rendu visuel riche dans le chat.
  * Expansion des symboles (`%` → `pour cent`, `&` → `et`, `@` → `arobase`).

### F. Synchronisation Fine du Mode Karaoké (Mot-à-mot fluide)
* **Symptôme** : Avec Deepgram, le karaoké surlignait des paragraphes entiers (30 à 50 mots allumés simultanément) créant un bloc visuel statique au lieu d'un défilement mot par mot. Crash JavaScript `maybeRescaleSentences is not defined` suite au refactoring initial.
* **Résolution** :
  * Imposition de la granularité mot-à-mot fine (`grain: 'word'`) via `estimateKaraokeWords` recalculé et synchronisé dynamiquement sur l'horloge PCM de lecture.
  * Surlignage individuel du seul mot actif dans `MarkdownContent.jsx`.
  * Rétablissement de l'alias unifié `maybeRescaleSentences` résolvant définitivement l'erreur d'affichage.

### G. Purge des Comptes Démo Legacy (Suppression d'Ivonne)
* **Symptôme** : Le compte `Ivonne` réapparaissait dans la barre latérale des sessions actives de Xavier.
* **Résolution** :
  * Suppression de `DEMO_GUESTS` dans `demoGuests.js` et nettoyage de la table `users` MariaDB.
  * Purge du registre local persistant du bridge OpenCode (`~/.config/opencode-bridge/sessions.json`) et suppression du dossier résiduel `/data/opencode-ws/Ivonne`.
  * Ne subsistent que les comptes légitimes (`admin@univ9.shaper`, `xavier@xavdp.pro`).

---

## 3. Nouvelles Règles Architecturales Immutables (Git)

Toutes ces exigences ont été intégrées dans les documents de référence du projet :

1. **Règle 17 (`software/RULES.md`) — Mandatory TTS Phonetic Dictionary, Acronym Expansion & Fine Word Karaoke** :
   * Normalisation universelle du texte parlé via `ttsFormat.js`.
   * Interdiction du surlignage par paragraphe entier (`grain: 'sentence'`) au profit du mot-à-mot (`grain: 'word'`).
2. **Règle 18 (`software/RULES.md`) — Primary Admin Account Onboarding Protocol** :
   * À la fin du déploiement d'un univers, l'agent DOIT demander à l'opérateur humain ses identifiants souhaités (Email, Nom, Mot de passe) pour créer son compte administrateur maître.
   * Proscription absolue des comptes démo parasites non sollicités.
3. **Mise à jour de `FOR-THE-AGENT.md`** :
   * 4 invariants de non-régression ajoutés pour guider tout agent futur.

---

## 4. Bilan des Tests et Validation en Direct

* **Tests unitaires monorepo** : 180/180 tests passés avec succès (`npm test`).
* **Test de boucle audio fermée** : `test-voice-player.mjs` validé à 100% (STT Nova-3 + TTS Aura-2 + 401 strict).
* **Validation visuelle Chrome en direct** : Navigation automatisée sur `https://ia-p3.xavdp.pro/console/opencode/zaza/Xavier` confirmant l'absence totale d'erreur d'affichage, le chargement du briefing Zephir et la présence exclusive de la session Xavier (`Actives (1)`).
