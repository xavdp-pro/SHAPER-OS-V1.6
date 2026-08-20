# /opt/bridge — stack bridge + CLI IA (hors turbinobash)

Tout le stack **bridge** (serveurs HTTP, LiteLLM, binaires CLI) vit sous **`/opt/bridge/`**,
pas dans `/apps/<app>/`. Les backups et `tb app sudo/bulldozer` ne touchent que `/apps/`.

## Layout

```
/opt/bridge/
├── scripts/           install-opt-clis.sh, migrate-from-apps.sh, opt-bridge-paths.sh
├── cursor/            cursor-agent-bridge (:4310 helm-v2)
│   ├── bin/cursor-agent
│   ├── versions/<ver>/
│   ├── server.mjs
│   ├── .env
│   └── start-bridge.sh
└── claude/            claude-bridge (:4320) + LiteLLM (:4330)
    ├── bin/claude
    ├── server.mjs
    ├── .env
    ├── litellm-config.yaml
    ├── .venv/         LiteLLM (Python)
    ├── node_modules/  dépendances npm (hors backup app)
    └── start-all.sh
```

L’ancien `/apps/<app>/bridge/` n’existe plus sous helm-v2 — tout est ici.

**Antigravity (`agy`)** : `/opt/bridge/antigravity/` — port **4330** sur gbs-tools.  
Clé API et freeze : voir [`AGY-ANTIGRAVITY.md`](./AGY-ANTIGRAVITY.md).

## Install / migration

**Nouvelle machine** (root) :

```bash
bash /opt/bridge/scripts/migrate-from-apps.sh   # depuis /apps/<app>/bridge legacy
# ou, si déjà migré :
bash /opt/bridge/scripts/install-opt-clis.sh    # CLI seulement
bash /opt/bridge/cursor/scripts/install-h1.sh   # cursor bridge + systemd
```

**Services** (user `helm-v2`) :

```bash
systemctl --user -M helm-v2@ enable --now cursor-agent-bridge claude-bridge
```

## Configuration

| Variable | Défaut |
|----------|--------|
| `OPT_BRIDGE_ROOT` | `/opt/bridge` |
| `CURSOR_AGENT_BIN` | `$OPT_BRIDGE_ROOT/cursor/bin/cursor-agent` |
| `CLAUDE_BIN` | `$OPT_BRIDGE_ROOT/claude/bin/claude` |

Fichiers `.env` : `/opt/bridge/cursor/.env`, `/opt/bridge/claude/.env`  
(voir aussi [`CONTROL-SCOPE.md`](./CONTROL-SCOPE.md) — shell agent ≠ `app/.env`).

Workspaces agent : toujours sous `/apps/helm-v2/ws` (`CURSOR_WS_BASE`, `CLAUDE_WS_BASE`).

## Git

**Rien sous `/opt/bridge/` n’est dans le backup git de l’app** :

| Contenu | Versionné ? |
|---------|-------------|
| `cursor-agent`, `claude` (binaires) | Non — install machine |
| `.venv`, `node_modules` | Non |
| `.env` (secrets) | Non |
| `server.mjs`, scripts | Oui — repo [claude-code-llm](https://github.com/xavdp-pro/claude-code-llm) + cursor bridge sur disque |

Le code source peut être cloné / rsync vers `/opt/bridge` ; les gros artefacts restent hors git.

## Bulldozer

`tb app sudo/bulldozer helm-v2` ne touche **pas** `/opt/bridge/`.  
Dans l’app il peut rester à corriger : `esbuild` dans `app/node_modules` → `bash app/scripts/fix-exec-bits.sh`.

Voir [`BULLDOZER-INCIDENT.md`](./BULLDOZER-INCIDENT.md), [`BRIDGE.md`](./BRIDGE.md).
