# Helm-v2 — contexte agent (source de vérité)

Chat humain : **français**. Code / commentaires : **anglais**.

## Identité

| Élément | Valeur |
|---------|--------|
| Produit | **KovZu** — console multi-CLI (plugins) |
| App turbinobash | `helm-v2` (profil **noweb** + MariaDB) |
| Serveur | **gbs-h1** |
| Code | `/apps/helm-v2/app` |
| Repo | https://github.com/xavdp-pro/helm-v2 (privé) |
| URL | **https://helm2.xavdp.pro** |
| User Unix / MySQL | `helm-v2` |

Fork / évolution de helm-v1 — **ne pas mélanger** les ports ni les bridges.

## Ports

| Service | Port |
|---------|------|
| Vite | **7923** |
| API | **7926** |
| cursor-agent-bridge | **4310** |
| claude-bridge | **4320** |
| LiteLLM (claude-code-llm) | **4330** |

helm-v1 reste sur 7823 / 7826 / 4210.

## Architecture plugins

```
Helm-v2 chat UI + API
        │
        ▼
  sessionOrchestrator (briefing, clear, prime — plugin-agnostic)
        │
        ▼
  agentAdapters (cursor / claude / generic — per-CLI specifics)
        │
        ▼
  agentPlugins (HTTP bridge registry)
        ├── cursor  → :4310 → cursor-agent CLI
        └── claude  → :4320 → Claude Code CLI (+ LiteLLM :4330)
```

### Contrat adapter (`server/lib/agentAdapters/`)

Chaque CLI expose un adapter avec :

| Capability | Description |
|------------|-------------|
| `stopRun` | Peut interrompre un run en cours (`/conversations/stop`) |
| `resetSession` | Peut remettre à zéro le contexte CLI |
| `bindWorkspace` | Peut lier un cwd par conversation |
| `modelField` | `composer` \| `litellm` \| `passthrough` pour `/api/inject` |
| `transportLabel` | Libellé status UI |

Méthodes : `resetSession`, `stopRun`, `buildInjectBody`.

Ajouter un CLI = nouveau fichier adapter + entrée `AGENT_PLUGINS`.

### API session orchestrée

| Route | Rôle |
|-------|------|
| `POST /api/session/prime` | Briefing + run prime (timeline serveur) |
| `POST /api/session/reset` | Reset CLI ; `{ prime: true }` recharge le briefing |
| `POST /api/session/clear` | **Préféré UI** : stop + timeline vide + reset + prime |

- Ack vocal **Groq** avant la réponse, **quel que soit** le CLI / modèle.
- Modèles Cursor : Grok 4.5 (low/medium/high × fast) + Composer 2.5.

## Deploy (gbs-h1, one-shot)

URL : **https://helm2.xavdp.pro** — code : `/apps/helm-v2/app`

```bash
cd /apps/helm-v2/app
npm run deploy          # build + API :7926 + vite preview :7923
npm run deploy:front    # build + restart front seulement
npm run deploy:api      # restart API seulement
```

PM2 : `helm-v2-api`, `helm-v2-vite` (+ `helm-v2-claude-bridge`, `helm-v2-litellm` si Claude).

Claude bridge : **`/opt/bridge/claude/`** ([claude-code-llm](https://github.com/xavdp-pro/claude-code-llm)).

Stack bridge complet (CLI + serveurs HTTP + LiteLLM) : **`/opt/bridge/`** — voir [`mds/OPT-BRIDGE.md`](./mds/OPT-BRIDGE.md).

## Docs agents (travail récent)

**Agents parallèles — cible helm-v2 uniquement :**

1. [`mds/INDEX-AGENTS.md`](./INDEX-AGENTS.md)
2. [`mds/DEMANDES-AUDIT-HELM2.md`](./DEMANDES-AUDIT-HELM2.md) ← demandes + conformité
3. [`mds/TRAVAIL-RECENT-JUIL-2026.md`](./TRAVAIL-RECENT-JUIL-2026.md)

| Doc | Sujet |
|-----|-------|
| [`FEATURE-SESSIONS-WORKSPACES.md`](./FEATURE-SESSIONS-WORKSPACES.md) | Stepper, machines, paths, titres CURSOR |
| [`FEATURE-VOIX-PRESENTATION.md`](./FEATURE-VOIX-PRESENTATION.md) | Voix, karaoké, Reborn, présentation auto |
| [`FEATURE-UI-CONSOLE.md`](./FEATURE-UI-CONSOLE.md) | Scroll, aide ?, wake lock |

**Ne pas modifier helm-v1** pour KovZu.
