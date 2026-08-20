# Vault-v1 — pointeur (vue hub cross-projets)

> ⚠️ **Ce fichier n'est PAS la source de vérité.**
> La référence technique du vault vit dans **son app** (le home d'une app tb est
> `app/`, jamais `mds/`) :
>
> ### 👉 Source de vérité : `/apps/vault-v1/app/mds/PLAN-V1.md`
>
> Toute décision (schéma, chiffrement, render, phases, sécurité) est là-bas.
> Ce fichier ne garde que la **vue hub** (place du vault dans l'écosystème).

---

## Place dans l'écosystème (hub)

| App | Rôle | Contenu | Visible LLM ? |
|-----|------|---------|---------------|
| **`vault-v1`** | Coffre secrets | `passwd`, tokens, clés API | **Non** — noms seulement |
| **`codex-v1`** | Contexte & infra agentique | briefings, normes, digests | Oui — c'est fait pour |
| **`auth-v1`** | Authentification centralisée | users, groupes, rôles, apps, JWT | Non — tokens/hash |
| **`maestro-v1`** | Moteur d'exécution | lanes, tasks, runs | Consomme render + codex |
| **`helm-v2`** | Cockpit humain | chat, voix, prime | `controlScope.js` = noms seulement |

## Rappels clés (détail dans la source de vérité)

- **Secrets uniquement** — le contexte agent va dans `codex-v1`.
- **MariaDB AES-256-GCM** ; `master.key` sous `/apps/vault-v1/etc/encryption/`.
- **Rien de vital dans `/opt`** (pas sauvegardé) — tout en tb + MariaDB.
- Côté agent/LLM : **noms** de secrets, jamais les valeurs.

## Docs liés

| Doc | Rôle |
|-----|------|
| `/apps/vault-v1/app/mds/PLAN-V1.md` | **Source de vérité vault** |
| [`PLAN-CODEX-V1.md`](./PLAN-CODEX-V1.md) | Contexte agent / digests |
| [`UNIVERSE-V1.md`](./UNIVERSE-V1.md) | Modèle univers |
| [`PLAN-SYMPHONY-PILOT.md`](./PLAN-SYMPHONY-PILOT.md) | Rythme pilote coordonné |

---

*Pointeur — dernière révision : 24/07/2026. Éditer la source de vérité, pas ce fichier.*
