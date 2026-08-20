# Index documentation agents — KovZu (helm-v2)

**Lire d’abord :** [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) · [`regles.md`](./regles.md)

## ⚠️ Cible obligatoire

| | |
|--|--|
| **Travail ici** | `/apps/helm-v2/app` · https://**ia.gbsinfo.org** (gbs-tools) / helm2.xavdp.pro selon tunnel |
| **Interdit** | `/apps/helm-v1/app` · helm.xavdp.pro (sauf demande explicite) |
| **Interdit** | cursorauto |

Les sessions Cursor historiques parlent souvent de « helm » / helm-v1. **Toute nouvelle demande KovZu = helm-v2.**

Ce dossier `mds/` est la source de vérité pour les agents Cursor qui travaillent **en parallèle**.

## Par où commencer

| Priorité | Document | Contenu |
|----------|----------|---------|
| 1 | [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) | Identité, ports, architecture plugins, deploy |
| 2 | [`DEMANDES-AUDIT-HELM2.md`](./DEMANDES-AUDIT-HELM2.md) | **Liste des demandes + conformité code** (OK / manquant / améliorer) |
| 3 | [`TRAVAIL-RECENT-JUIL-2026.md`](./TRAVAIL-RECENT-JUIL-2026.md) | Récap sessions Cursor juillet 2026 |
| 4 | [`FEATURE-SESSIONS-WORKSPACES.md`](./FEATURE-SESSIONS-WORKSPACES.md) | Stepper, machines SSH, chemins, titres |
| 5 | [`FEATURE-VOIX-PRESENTATION.md`](./FEATURE-VOIX-PRESENTATION.md) | Voix, karaoké, Reborn, présentation |
| 6 | [`FEATURE-UI-CONSOLE.md`](./FEATURE-UI-CONSOLE.md) | Scroll, aide ?, wake lock |
| 7 | [`TIMELINE-SYNC.md`](./TIMELINE-SYNC.md) | Timeline serveur, contrat run_id, builder multi-bridge |
| 8 | [`VOICE-NAMES.md`](./VOICE-NAMES.md) | Noms de machines au micro : lexique, correcteur, alias |
| 9 | [`BRIDGE.md`](./BRIDGE.md) | Qu'est-ce qu'un bridge, comment il marche, pièges (.env séparés) |
| 10 | [`OPT-BRIDGE.md`](./OPT-BRIDGE.md) | Stack bridge sous `/opt/bridge` (hors backup app, hors bulldozer) |
| 10b | [`AGY-ANTIGRAVITY.md`](./AGY-ANTIGRAVITY.md) | **Clé `AQ.` / agy** — ne pas mettre `GEMINI_API_KEY` (freeze 429) |
| 10c | [`OPENCODE-MODELES-GRATUITS.md`](./OPENCODE-MODELES-GRATUITS.md) | OpenCode **sans clé Claude** — `opencode/big-pickle` et `*-free` |
| 11 | [`UNIVERSE-V1.md`](./UNIVERSE-V1.md) | **Univers** — écho-système, vault maître, freetier → vault |
| 12 | [`PLAN-SYMPHONY-PILOT.md`](./PLAN-SYMPHONY-PILOT.md) | **Pilote intégré** — vagues vault + codex + maestro ensemble |
| 13 | [`PLAN-VAULT-V1.md`](./PLAN-VAULT-V1.md) | Coffre secrets — home `/apps/vault-v1/app/mds/` |
| 14 | [`PLAN-CODEX-V1.md`](./PLAN-CODEX-V1.md) | Registre **contexte agent**, digests, infra agentique (≠ vault) |

## Sessions Cursor utiles (transcripts)

Les agents peuvent consulter les transcripts dans le workspace Cursor (pas dans le repo git) :

| Session | Sujet principal |
|---------|-----------------|
| [Voix & infra KovZu](5e16752c-c1cb-4fe1-8050-ab927677d3e9) | Bridge, voix chat, Groq ack, karaoké Cartesia, multi-langues |
| [Livrables & admin voix](ae6b430b-dc9d-4031-9f4f-8d969b34028d) | Format tableaux/charts, admin voix saved vs active, karaoké ≠ affichage |
| [État des lieux](60cf676a-99b9-4a6a-b09a-3510438c9115) | Synthèse helm-v1 / helm-v2 |
| [Présentation & helm-v2](0f9ca16e-7b2e-4cc2-90fe-cdf61180b500) | Prime session, bouton ?, présentation |

## Machines & workspaces (état connu)

| Machine | User | Exemple session | Workspace typique |
|---------|------|-----------------|-------------------|
| **gbs-h1** | helm-v2 / Xavier | Interface | `/apps/helm-v2/app` |
| **acer** | zaza | NOW2 | `/home/zaza/Bureau/NOW2` |
| **asus** | zaza | CURSOR / NOW3 | `/home/zaza/Bureau/CURSOR` |

Format session KovZu : `machine/user/nom` → URL `/console/machine/user/nom`

## Règles communes (rappel)

- Chat humain : **français** — code / commentaires : **anglais**
- Fetch front : `src/api/client.js` uniquement
- DB : **mysql2** uniquement
- Pas `alert` / `confirm` / `prompt`
- **Ne pas modifier** helm-v1 ni cursorauto sauf demande explicite
- **Commit autorisé en permanence** — pas besoin de demander (jamais de secrets)
- Deploy : `npm run deploy` depuis `/apps/helm-v2/app`

## Suite prioritaire (VISION)

Auth réelle + magic links → voix mobile → WebSocket desk → POC CRM

Voir [`VISION.md`](./VISION.md).
