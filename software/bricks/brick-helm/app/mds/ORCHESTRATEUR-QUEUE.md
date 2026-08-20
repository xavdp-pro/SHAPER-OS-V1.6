# Orchestrateur — queue + planification + auto-correction (plan)

> **Plan d'architecture** (23 juil. 2026). Le code viendra ensuite. Trace
> volontaire de toute l'architecture dynamique (demande Xavier).
> App turbinobash créée : **`kovzu-orchestrator-v1`** (profil noweb + MariaDB).
> Voir aussi [`ORCHESTRATION-DYNAMIQUE.md`](./ORCHESTRATION-DYNAMIQUE.md),
> [`CONCRETISER-SHAPER.md`](./CONCRETISER-SHAPER.md).

## But

Un moteur qui **met en file, planifie et dispatche des tâches vers des agents
cursor-agent CLI répartis sur l'infra**, collecte un **retour complet**, et
**s'auto-corrige** pour ne **jamais refaire la même erreur**. Piloté par l'agent
maître OU par un humain. **Multidimensionnel et adaptatif** ; l'utilisateur final
ne voit que « ça marche » (la rabona : le geste dur rendu simple et élégant).

## Emplacement

- App : `/apps/kovzu-orchestrator-v1/app` (user + DB MariaDB `kovzu-orchestrator-v1`).
- Profil **noweb** : c'est un service de fond (pas de vhost). Piloté par KovZu
  (helm-v2) via une API interne + partagé avec l'agent maître.

## Composants

1. **Queue** — table des tâches à faire (mission, cible, planning, priorité,
   contexte, tentatives, statut).
2. **Scheduler** — déclenche les tâches : `cron` / `systemd` timer / **boucle
   maison** (événementiel, backoff, dépendances). Temps fixe ET sur changement.
3. **Dispatcher** — lance l'agent cursor CLI sur la **bonne machine** :
   - via l'**API du bridge** de la machine cible (**IP VPN WireGuard + token**),
     `POST /api/inject` avec le message/mission + workspace,
   - **ou** en SSH (`~/.ssh/config` : user + chemin) si pas de bridge.
   - La cible est décrite par **machine / user / chemin (workspace)** — la
     convention KovZu (`node/user/conversation`).
4. **Feedback collector** — l'agent renvoie un **rapport complet** : a-t-il réussi
   **en autonomie** ? erreurs rencontrées, ce qu'il a fait, artefacts produits.
   Stocké par run (via SSE du bridge + un rapport final structuré).
5. **Planner agent (maître)** — lit les retours :
   - autonome & OK → tâche done ;
   - échec/anomalie → le planner **se reconnecte** pour **identifier et corriger**
     le problème (contexte, tâche, ou ce que l'agent a fait), relance,
   - puis **écrit une leçon** pour que la même erreur ne se reproduise jamais.
6. **Lessons store** — base de connaissances erreurs→corrections, **réinjectée
   dans le contexte** des tâches suivantes (apprentissage). C'est le cœur
   « ne plus jamais la même erreur ».

## Modèle de données (MariaDB, à créer)

| Table | Rôle |
|-------|------|
| `tasks` | id, mission, target_node, target_user, target_path, model_tier, schedule (cron/at/event), priority, context (JSON), status, attempts, max_attempts, created_by (agent\|human), created_at |
| `runs` | id, task_id, started_at, ended_at, transport (bridge\|ssh), run_id bridge, autonomous (bool), success (bool), report (TEXT), error (TEXT) |
| `lessons` | id, signature (erreur normalisée), context_hint, fix, task_kind, created_at — réinjecté au prochain contexte |
| `schedules` | id, task_id, kind (cron\|timer\|event), spec, next_run_at, active |

## Flux complet

```
Humain / Agent maître
        │  crée/planifie une tâche (mission + cible + contexte + planning)
        ▼
     [Queue] ──(scheduler: heure ou événement)──► [Dispatcher]
        │                                              │ API bridge (IP VPN+token) ou ssh
        │                                              ▼
        │                                   cursor-agent CLI (machine cible, workspace)
        │                                              │ exécute la mission
        │                                              ▼
        │                                   [Feedback] rapport complet (autonome? erreurs? artefacts)
        ▼                                              │
   [Planner agent] ◄────────────────────────────────┘
        │  OK autonome → done
        │  sinon → se reconnecte, corrige (contexte/tâche), relance
        ▼
   [Lessons] ──► réinjecté dans le contexte des prochaines tâches
```

## Transport (lancer l'agent à distance)

- **Bridge (préféré)** : chaque machine expose un cursor-agent-bridge sur son
  **IP VPN** (WireGuard) avec un **token**. Le dispatcher fait `POST /api/inject`
  (mission) et écoute `/api/events` (retour temps réel + run_id).
- **SSH (repli)** : `~/.ssh/config` fournit user + host ; on lance/relance l'agent
  dans le **chemin (workspace)** voulu.
- La cible = **machine / user / chemin** — jamais d'URL en dur ; on résout à
  l'exécution (convention turbinobash `{mon-app}` + KovZu `node/user/conversation`).

## Routage & pilotage

- **Routage modèle** par tâche : léger (modèle + code) vs artillerie lourde
  (agent Cursor CLI complet). Choisi selon la complexité.
- **Pilote** : l'agent maître (auto-planification) **ou** un humain (KovZu UI).
- L'agent maître peut **créer un agent subalterne** (espace tb dédié) avec le
  **contexte qu'il choisit**, et lui confier une mission de la queue.

## Intégration KovZu

- KovZu (helm-v2) = **cockpit** : créer/planifier des tâches, voir la queue, les
  runs, les retours, les leçons — en langage naturel/voix. L'utilisateur final ne
  voit que le résultat (« ça marche »).
- L'orchestrateur = **moteur** ; le bridge (par machine, VPN) = **transport**.

## Reste à coder (phases)

1. Schéma MariaDB (`tasks/runs/lessons/schedules`) + `db.js` (mysql2).
2. Dispatcher bridge (IP VPN + token) + repli ssh + collecte SSE → `runs`.
3. Scheduler (boucle maison + option cron/systemd).
4. Planner agent : lecture des retours, boucle d'auto-correction, écriture des
   `lessons`, réinjection dans le contexte.
5. API interne + UI KovZu (queue, runs, leçons) + création/planif par voix.
6. Sécurité : cloisonnement par machine/user, garde-fous sur actions sensibles.
