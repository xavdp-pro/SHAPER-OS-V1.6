# Helm-v2 — timeline serveur & contrat d'événements

> Voir aussi [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md). Architecture en place depuis juillet 2026.

## Principe

**La timeline est construite et persistée par le serveur Express** (`server/lib/timelineBuilder.js`), pas par le navigateur. Les navigateurs appliquent les événements SSE localement pour l'affichage instantané, mais ne sauvegardent jamais l'historique — ils **relisent** l'état serveur pour converger (fin de run, `timeline_sync`).

```
bridges (cursor :4310 / claude :4320 / nœuds asus·acer) ── SSE ──► timelineBuilder (serveur) ──► data/timelines/*.json
        │                                 │
        └── SSE filtré /conversation ──► navigateurs (affichage live, lecture seule)
                                          ▲ console-sync (timeline_sync) + GET /timeline
```

## Contrat d'événements (bridge)

Chaque injection crée un run avec un `run_id` unique. **Tous** les événements du run portent :

| Champ | Rôle |
|-------|------|
| `conversation` | Nom bridge de la conversation |
| `run_id` | UUID du run — permet de rejeter les événements d'un run périmé |
| `seq` | Compteur monotone par run |

`POST /api/inject` (bridge) renvoie `run_id`. `GET /api/events?conversation=X` ne diffuse que les événements de X (cloisonnement) ; sans filtre : tout (consommateur serveur).

## Côté serveur (`timelineBuilder.js`)

- Une connexion SSE persistante par nœud CLI (reconnexion 3 s).
- Événements appliqués avec **le même réducteur que le front** (`src/lib/runStream.js`).
- Mapping `run_id bridge → item run de la timeline` établi à l'inject (`linkBridgeRun`). Événements d'un run périmé → **rejetés** (pas d'heuristique).
- `run_aborted` n'aborte que le run qu'il possède — jamais un tour fraîchement injecté (`reason: replaced`).
- Persistance débouncée (700 ms) + immédiate sur `response_complete` / `run_complete` / abort ; chaque sauvegarde émet `timeline_sync` (console-sync).

## Écritures de tours (routes)

| Action | Route | Écriture serveur |
|--------|-------|------------------|
| Envoi message | `POST /api/inject` + `turn: {humanId, runId, images}` | human + run (mêmes ids que le front) **avant** l'appel bridge |
| Tour vocal | idem + `voiceTurn`, `ackText` | human + `voice_ack` + run (flag `voiceTurn`) |
| Édition/renvoi | `POST /api/inject` + `resend: {humanId, text, images, runId}` | tronque au human, réécrit, reconstruit le contexte (`injectText`) côté serveur |
| Vidage + briefing | `POST /api/session/reset` + `prime, primeRunId` | run de présentation (`prime: true`) |
| Stop | `POST /api/session/stop` | runs `running` → `aborted` |
| Échec bridge | (automatique) | run aborté + item `system` avec l'erreur |

Le front passe ses ids (`humanId`, `runId`) pour que timelines locale et serveur soient identiques.

## Ce que le front ne fait plus

- `PUT /api/timeline` pendant le stream (l'endpoint reste pour compat, avec lock optimiste).
- Sauvegarde du human/ack/run à l'envoi — le serveur l'écrit.
- L'auto-save débouncé de `Dashboard.jsx` a été supprimé.

## Tests

`server/lib/timelineBuilder.test.js` (contrat run_id, rejet périmés, resend, prime, échec) — `npm test`.

## Spécifique helm-v2

- **Multi-sources** : le builder consomme chaque URL unique (nœuds CLI gbs-h1/asus/acer + plugins cursor/claude). Le routage des événements vers le bon chemin passe d'abord par le registre global `run_id → chemin` (rempli à l'inject), puis par `machine/user/nom` en secours.
- **run_id/seq stampés centralement** dans `broadcast()` des deux bridges (`liveRuns` par conversation) — aucun site d'émission modifié individuellement.
- Le `sessionOrchestrator` (prime/clear serveur) adopte le run de présentation dans le builder (`adoptPendingRun`) et lie le run bridge.
- Le store v2 refuse les écritures non verrouillées : le builder écrit en `force: true` (autorité serveur).
- Front : **n'écrit plus la timeline** (depuis le 23 juil. 2026). `persistTimeline` est un no-op ; le serveur (builder + orchestrator + routes inject/session) est seul écrivain et diffuse `timeline_sync` à chaque écriture. Le front affiche en mémoire (`setTimelines`) et converge par relecture (fin de run, `timeline_sync`). Vérifié au navigateur : envoi → rechargement → historique intact, **0 `PUT /api/timeline`** émis par le client.

## Stockage MariaDB (depuis le 23 juillet 2026)

Les timelines ne sont plus des fichiers JSON mais une table MariaDB `timelines`
(`conv_hash` PK, `conv_path`, `items` LONGTEXT JSON, `updated_at` ISO string) —
conforme à la règle « mysql2 uniquement ». API `timelineStore` **async**
(`loadTimeline`/`saveTimeline`/`deleteTimeline`/`purgeTimeline`/`copyTimeline`),
schéma créé au boot (`ensureTimelineSchema`).

- **Migration transparente** : au premier accès d'une conversation, si aucune
  ligne DB n'existe mais qu'un ancien `data/timelines/<hash>.json` est présent,
  il est importé automatiquement (lazy). Aucune perte d'historique.
- `updated_at` reste une chaîne ISO générée en JS → le verrou optimiste
  (comparaison de chaînes) est préservé à l'identique.
- Le builder garde son cache mémoire `st.items` comme source synchrone pour
  l'ordre des événements ; la persistance DB est awaitée (immédiate en fin de
  run, débouncée sinon). Le consommateur SSE `await` chaque événement.

## Mode simple (utilisateur lambda)

`loadViewFilters(role)` : sans choix explicite de l'utilisateur, un non-admin démarre en « Réponse seule » (réflexion/outils/terminal/logs masqués) ; l'admin voit tout. Le choix manuel (localStorage) gagne toujours.
