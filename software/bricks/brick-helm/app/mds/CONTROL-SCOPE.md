# Méthodologie du contexte agent : GÉNÉRIQUE vs SPÉCIALISÉ

Architecture à **deux couches** pour le contexte injecté au prime — pensée pour
être adaptative : un nouvel agent, sur un espace de contrôle différent pour un
autre client, doit fonctionner sans changer de code, juste de configuration.

## Couche 1 — GÉNÉRIQUE (`server/lib/agentSkills.js`)

Méthodes valables **partout, pour tout déploiement** : ingestion de documents,
livrables, API-first, orchestration maître/subalternes, planification, routage
modèle, reborn, pouvoirs host-root. Ne change jamais d'un client à l'autre.

## Couche 2 — SPÉCIALISÉ (`server/lib/controlScope.js`)

Ce que **CE déploiement précis** contrôle : domaines Cloudflare, comptes cloud,
machines accessibles… **Différent pour chaque client/installation.** Injecté au
prime juste après les skills génériques, sous un en-tête dédié
`PÉRIMÈTRE DE CONTRÔLE` — vide (rien injecté) si le déploiement n'a rien
configuré, sans code différent.

### Exemple actuel : Cloudflare (23/07/2026)

Xavier contrôle les domaines **xavdp.pro** et **szde.fr** via un token API
Cloudflare (gestion tunnels/DNS/sous-domaines).

- `.env` (app + **les deux bridges**, cursor et claude — voir ci-dessous) :
  ```
  CLOUDFLARE_API_TOKEN=...
  CLOUDFLARE_DOMAINS=xavdp.pro,szde.fr
  ```
- `controlScope.js` lit ces variables et génère un texte de contexte
  **sans jamais citer le token en clair** — seulement son nom de variable
  d'env (`$CLOUDFLARE_API_TOKEN`), que l'agent utilise depuis ses propres
  commandes shell/scripts (`curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" ...`).
  Le secret ne transite jamais dans le texte de conversation/logs LLM.
- Vérifié : le token est présent dans l'environnement réel des deux process
  bridge (`/proc/<pid>/environ`), pas seulement dans `app/.env` (qui est lu
  par un process Express complètement séparé — piège découvert et corrigé).

## ⚠️ Piège découvert : trois `.env` distincts, pas un seul

Il y a **trois** fichiers `.env` sur ce déploiement, chacun lu par un process
différent — une variable ajoutée dans un seul ne suffit pas :

| Fichier | Process qui le lit | Sert à |
|---------|--------------------|--------|
| `/apps/helm-v2/app/.env` | API Express (server/config.js) | Réponses HTTP, prime (texte du contexte) |
| `/opt/bridge/cursor/.env` | bridge cursor → **process cursor-agent réel** | Shell effectif de l'agent Cursor |
| `/opt/bridge/claude/.env` | bridge claude → **process claude réel** | Shell effectif de l'agent Claude |

**Toute variable que l'agent doit utiliser en shell (tokens, clés API externes)
doit être dans les DEUX `.env` de bridge**, pas seulement dans `app/.env`. Le
contexte texte (prime) vient de l'API donc lit `app/.env`, mais le shell réel
de l'agent vient du bridge correspondant.

De plus, `bridge/claude/start-bridge.sh` ne faisait qu'un `source .env` simple
suivi d'un **export nommé** (liste blanche) — toute nouvelle variable restait
invisible du process final. Corrigé en `set -a; source .env; set +a` (comme le
bridge cursor) : **toute** variable de `.env` est désormais automatiquement
exportée, sans devoir éditer le script à chaque nouvelle clé — nécessaire pour
que la couche « spécialisé » reste vraiment adaptative sans toucher au code.

## Évolution future : vault par client (pas maintenant)

Actuellement `controlScope.js` lit l'env local. Architecture prête pour un
vault : remplacer `loadFromEnv()` par un chargeur vault-par-tenant — le reste
(génération du texte de contexte, injection au prime, garde-fou "jamais le
secret en clair") ne change pas. Un nouveau client avec un périmètre de
contrôle différent (autres domaines, autre cloud) n'exigera qu'une nouvelle
entrée de config/vault, pas de nouveau code.

Voir aussi [`BULLDOZER-INCIDENT.md`](./BULLDOZER-INCIDENT.md) (pourquoi les
scripts de bridge perdaient leurs droits) et
[`ORCHESTRATION-DYNAMIQUE.md`](./ORCHESTRATION-DYNAMIQUE.md).
