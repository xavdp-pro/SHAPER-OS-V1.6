# Architecture agent orchestrateur + file de tâches

Document de réflexion infra — Helm/KovZu.  
**Statut** : conception (pas encore implémenté en base).

---

## Intention

Séparer deux rôles :

| Rôle | Parle à l’humain | Exécute du code / CLI |
|------|------------------|------------------------|
| **Orchestrateur** | Oui — dialogue, décisions, reformulation | Non (ou très peu) |
| **Worker CLI** | Non | Oui — une tâche à la fois |

L’orchestrateur ne fait pas tout : il comprend, découpe, met en file, et rend compte quand le worker a fini.

---

## Modèle en 3 couches

```
┌─────────────────────────────────────────────────────────┐
│  Couche conversation                                     │
│  Humain (voix/chat) ↔ Agent orchestrateur               │
└───────────────────────────┬─────────────────────────────┘
                            │ crée tâche / lit résultat
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Couche file                                             │
│  agent_tasks (MariaDB) → Worker / Cursor CLI            │
└───────────────────────────┬─────────────────────────────┘
                            │ lit snapshot / écrit résultat
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Couche mémoire                                          │
│  briefing utilisateur · agent_memory · résumés session  │
└─────────────────────────────────────────────────────────┘
```

---

## Ce que Helm a déjà

| Élément | Rôle |
|---------|------|
| `users.briefing` | Présentation + consignes permanentes opérateur |
| `sessionPrime` | Injecté au démarrage session CLI |
| 1 conversation = 1 `chat_id` | Mémoire conversationnelle du worker (bridge `--resume`) |
| Bridge | 1 agent actif par conversation ; nouvel envoi remplace l’agent en cours |

Ça couvre le **profil opérateur**, pas encore une **file de tâches** ni une **mémoire projet partagée**.

---

## Tables MariaDB proposées

### `agent_tasks` — file de travail

```sql
CREATE TABLE agent_tasks (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  conversation_id VARCHAR(255) NOT NULL COMMENT 'Conversation Helm (orchestrateur ou worker)',
  status          ENUM('pending','running','done','failed','cancelled') NOT NULL DEFAULT 'pending',
  priority        INT NOT NULL DEFAULT 0,
  title           VARCHAR(500) NOT NULL,
  prompt          TEXT NOT NULL COMMENT 'Instruction autonome pour le worker',
  context_json    JSON NULL COMMENT 'Snapshot injecté au lancement',
  result_json     JSON NULL COMMENT 'Sortie structurée du worker',
  chat_id         VARCHAR(64) NULL COMMENT 'Fil Cursor du worker (optionnel, par tâche)',
  worktree        VARCHAR(255) NULL COMMENT 'Isolation git si édition fichiers',
  error_message   TEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at      DATETIME NULL,
  finished_at     DATETIME NULL,
  INDEX idx_status_priority (status, priority, created_at),
  INDEX idx_user (user_id)
);
```

### `agent_memory` — mémoire durable (« contexte cultivé »)

```sql
CREATE TABLE agent_memory (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  scope           ENUM('user','project','client') NOT NULL DEFAULT 'user',
  memory_key      VARCHAR(128) NOT NULL,
  content         TEXT NOT NULL,
  source_task_id  BIGINT UNSIGNED NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_scope_key (user_id, scope, memory_key)
);
```

### `agent_session_summaries` — optionnel

```sql
CREATE TABLE agent_session_summaries (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  summary         TEXT NOT NULL,
  token_estimate  INT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conv (conversation_id, created_at)
);
```

---

## Les 4 niveaux de contexte

Du plus stable au plus volatile :

| Niveau | Contenu | Stockage | Injection |
|--------|---------|----------|-----------|
| **1. Permanent** | Qui est l’humain, règles, stack, ton | `users.briefing` + `.cursor/rules` | Toujours (prime + chaque tâche) |
| **2. Projet** | Architecture, décisions, conventions | `agent_memory` scope `project` | Tâches liées au code |
| **3. Session** | Fil de discussion récent | `chat_id` orchestrateur | Dialogue humain |
| **4. Tâche** | Objectif précis + fichiers ciblés | `agent_tasks.prompt` + `context_json` | Une seule exécution worker |

**Règle d’or** : le contexte général vit en **base**, pas dans la mémoire implicite d’un agent parallèle.

---

## Cycle de cultivation du contexte

1. **Humain parle** → orchestrateur écoute (son propre `chat_id`, léger).
2. **Décision** → « c’est une tâche code » → `INSERT agent_tasks` avec un `prompt` **autonome** (le worker ne doit pas deviner).
3. **Worker démarre** avec :
   - briefing utilisateur ;
   - extrait pertinent de `agent_memory` (pas tout) ;
   - prompt de la tâche ;
   - `--worktree` si édition de fichiers.
4. **Fin de tâche** → worker écrit `result_json`.
5. **Orchestrateur** lit le résultat, répond à l’humain en langage naturel.
6. **Mise à jour mémoire** (optionnel) : si décision durable → upsert dans `agent_memory`.

Exemple :

```
Humain: "Pour Dupont, toujours vérifier la TVA intracom"
  → orchestrateur: INSERT agent_memory (scope=client, key=client_dupont, content=...)
  → plus tard, tâche CRM Dupont: context_json inclut ce memory
```

---

## Préparer le contexte d’une tâche worker

Chaque tâche doit être **auto-suffisante**. Exemple de `context_json` :

```json
{
  "briefing_excerpt": "Opérateur: Xavier, stack Node+MariaDB…",
  "memories": [
    { "key": "client_dupont", "content": "Toujours vérifier TVA intracom" }
  ],
  "workspace": "/apps/helm-v1/app",
  "files_hint": ["server/lib/db.js", "server/routes/"],
  "constraints": ["mysql2 only", "no alert/confirm", "French UI"]
}
```

Prompt worker assemblé côté serveur :

```text
[CONTEXTE PERMANENT]
{briefing + memories sélectionnées}

[TÂCHE]
{title}
{prompt détaillé}

[CONTRAINTES]
{constraints}

[RÉSULTAT ATTENDU]
Réponds en JSON: { summary, files_changed, blockers }
```

Le worker n’a **pas besoin** du transcript vocal complet — seulement ce snapshot.

---

## File : égrener les tâches

```
pending → (worker libre ?) → running → done | failed
                ↓ non
            reste pending (FIFO ou priority)
```

- **1 worker actif par conversation** (comme le bridge aujourd’hui).
- Parallèle = plusieurs `conversation_id` ou worktrees, **pas** le même `chat_id`.
- L’orchestrateur peut enfiler N tâches ; le worker les prend une par une.

---

## Cursor CLI — rappels doc

| Besoin | Mécanisme Cursor |
|--------|------------------|
| Reprendre un fil | `--resume <chatId>` / `agent resume` |
| Parallèle sans conflit git | `--worktree [name]` |
| Branche de conversation | `/fork` (CLI interactif) |
| Mémoire partagée entre agents parallèles | **Non** — chaque session a son propre fil |

Réf. : [Using Agent in CLI](https://cursor.com/docs/cli/using), [Parameters](https://cursor.com/docs/cli/reference/parameters).

---

## Pièges à éviter

| Piège | Pourquoi | Alternative |
|-------|----------|-------------|
| Un seul agent pour tout | Contexte saturé, mélange dialogue + code | Orchestrateur + workers |
| Partager un `chat_id` entre tâches parallèles | Pas de mémoire partagée en live | 1 `chat_id` par fil |
| Tout injecter à chaque tâche | Fenêtre de contexte explosée | Sélection ciblée depuis `agent_memory` |
| Compter sur le CLI pour retenir | Session liée au workspace, limitée | DB = source de vérité |

---

## Chemin pragmatique pour Helm

### Phase 1 — minimal

- Table `agent_tasks` seule.
- Orchestrateur = conversation actuelle (humain).
- Worker = inject CLI existant ; 1 tâche = 1 inject avec briefing + prompt structuré.

### Phase 2

- Table `agent_memory` + écran admin pour éditer.
- Résumé auto en fin de session longue → `agent_session_summaries`.

### Phase 3

- Worktrees pour tâches parallèles.
- Priorités, annulation, notification voix quand `done`.

---

## API envisagée (esquisse)

| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/api/tasks` | Orchestrateur crée une tâche |
| `GET` | `/api/tasks` | Liste (filtre status, user) |
| `GET` | `/api/tasks/:id` | Détail + résultat |
| `POST` | `/api/tasks/:id/cancel` | Annulation |
| `POST` | `/api/tasks/dispatch` | Worker loop : prend la prochaine `pending` |
| `GET/PATCH` | `/api/memory` | CRUD `agent_memory` |

Worker loop (process ou cron léger) :

1. `SELECT … FROM agent_tasks WHERE status='pending' ORDER BY priority DESC, created_at LIMIT 1 FOR UPDATE`
2. `status='running'`, assemble prompt, inject bridge.
3. À la fin SSE `response_complete` → `status='done'`, `result_json=…`.

---

## Résumé

- L’agent humain **cultive** le contexte en écrivant en base (briefing + memory + tâches bien rédigées).
- Les workers **consomment** des snapshots courts à chaque exécution.
- La **DB** est la mémoire durable ; le `chat_id` Cursor n’est qu’une **session de travail**, pas l’archive.
