# Qu'est-ce qu'un « bridge » ?

Un **bridge** est un petit serveur HTTP local (Node.js) qui fait le pont entre
**KovZu** (l'API/l'UI web) et **un agent CLI réel** (`cursor-agent` ou `claude`)
qui tourne en headless sur une machine. C'est un traducteur : KovZu parle
HTTP/JSON, l'agent CLI parle stdin/stdout en `stream-json`.

## Ce qu'il fait concrètement

```
Navigateur → KovZu (API Express) → BRIDGE (HTTP local) → spawn cursor-agent/claude (process CLI)
                                         ↓
                                    parse le flux stdout ligne par ligne
                                         ↓
                                    rediffuse en SSE (Server-Sent Events)
```

1. **Reçoit** `POST /api/inject { conversation, message }` de KovZu.
2. **Lance** (`spawn`) le vrai binaire CLI (`cursor-agent -p "message"
   --output-format stream-json --resume <chatId>`, ou l'équivalent pour
   `claude`).
3. **Parse** sa sortie stdout ligne par ligne (JSON structuré : thinking, tool
   calls, texte de réponse…).
4. **Rediffuse** ces événements en temps réel via SSE (`GET /api/events`) que
   KovZu (le `timelineBuilder` serveur, voir `TIMELINE-SYNC.md`) écoute.
5. **Garde en mémoire** la correspondance conversation ↔ `chat_id`/`session_id`
   pour pouvoir faire `--resume` au tour suivant (continuité de session).

## Où ça vit (hors backup app)

Tout le stack bridge est sous **`/opt/bridge/`** — pas dans `/apps/helm-v2/`.
Voir [`OPT-BRIDGE.md`](./OPT-BRIDGE.md).

| Moteur | Chemin | Port |
|--------|--------|------|
| cursor | `/opt/bridge/cursor/` | **4310** |
| claude | `/opt/bridge/claude/` | **4320** (+ LiteLLM **4330**) |

Chacun a son **propre `.env`** (clé API du CLI, port, workspace de base) parce
que ce sont des **process séparés avec leur propre environnement shell**.
C'est un piège réel : le contexte texte de l'agent (généré par l'API Express,
qui lit `app/.env`) et le shell réel où tourne l'agent (géré par le bridge,
qui lit `/opt/bridge/<moteur>/.env`) sont **deux environnements différents** —
une variable ajoutée dans l'un n'existe pas forcément dans l'autre. Voir
[`CONTROL-SCOPE.md`](./CONTROL-SCOPE.md) pour un cas réel rencontré (token
Cloudflare) et [`BULLDOZER-INCIDENT.md`](./BULLDOZER-INCIDENT.md) pour les
permissions.

## Pourquoi « bridge » et pas « l'agent »

Il ne fait **aucune intelligence** lui-même — pas de logique métier, pas de
décision. Il ouvre juste le pont HTTP↔CLI et rediffuse ce qui se passe. Toute
la logique métier (timeline, MariaDB, voix, livrables, orchestration) vit côté
KovZu (l'API Express), jamais dans le bridge.

Voir aussi : [`TIMELINE-SYNC.md`](./TIMELINE-SYNC.md) (contrat d'événements
run_id/seq stampé par le bridge, consommé par le `timelineBuilder`),
[`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) (vue d'ensemble stack).
