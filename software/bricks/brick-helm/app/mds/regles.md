# Helm — règles d’environnement

> Voir aussi [`TURBINOBASH-BOOTSTRAP.md`](./TURBINOBASH-BOOTSTRAP.md) (convention `{mon-app}` — **obligatoire**), [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md), [`AUTH-USERS.md`](./AUTH-USERS.md), [`VISION.md`](./VISION.md).

Document pour les agents : **comment se comporter** dans Helm (gbs-h1), surtout autour de MariaDB et du code.

---

## Avant d’implémenter

1. Lire [`TURBINOBASH-BOOTSTRAP.md`](./TURBINOBASH-BOOTSTRAP.md) (turbinobash générique — install active gbs-h1 `/var/lib/turbinobash-web`)
2. Lire [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) (source de vérité Helm)
3. Lire [`VISION.md`](./VISION.md) (roadmap)
4. Si auth / users → [`AUTH-USERS.md`](./AUTH-USERS.md)
5. Appliquer **ce fichier** pour le comportement runtime

Chat humain : **français**. Code / commentaires : **anglais**.

---

## Identité & périmètre

| | |
|---|---|
| Produit | **KovZu** — https://helm.xavdp.pro |
| Serveur | **gbs-h1** — code `/apps/helm-v1/app` |
| App tb | `/apps/helm-v1/` (noweb + MariaDB) — `{mon-app}` = `helm-v1` |
| Fork de | cursorauto — **ne pas modifier** sauf demande explicite |
| Docker / packaging | **Plus tard** — pas maintenant |

---

## Règles code / UI

| Règle | Détail |
|-------|--------|
| Zero fake | Pas de données inventées, pas de fallback « pour que ça marche » |
| Dialogs | Pas `alert()` / `confirm()` / `prompt()` — modales React / toasts |
| HTTP front | Uniquement via `src/api/client.js` (pas de `fetch` dans les composants) |
| Styles | Classes existantes : `glass`, `input-field`, `btn-*`, `zone-sunk` |
| Git | Commit **autorisé en permanence** — pas besoin de demander |
| Secrets | Ne jamais committer `.env`, tokens, `etc/mysql/`, `HUME_*` |

---

## MariaDB — pilotage (obligatoire)

App turbinobash **helm-v1** : user Unix / MySQL = `helm-v1`, base = `helm-v1`.

### Accès

| Élément | Valeur |
|---------|--------|
| Host | `127.0.0.1` (défaut) |
| Port | `3306` |
| User | `helm-v1` |
| Database | `helm-v1` |
| Mot de passe | fichier `/apps/helm-v1/etc/mysql/localhost/passwd` |
| Override env | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_PASSWD_FILE` |

Le code lit le passwd via `server/lib/db.js` (`mysqlConfig()` → pool `mysql2/promise`).

### Interdits

- **Pas** de `mysql -e`, `mariadb -e`, ni shell SQL dans le code applicatif
- **Pas** de client autre que **`mysql2`** (package Node)
- **Pas** d’écriture du mot de passe en dur dans le repo
- **Pas** de commit du fichier `etc/mysql/.../passwd`

### Obligatoire dans le code

| Faire | Où / comment |
|-------|----------------|
| Connexion | `getPool()` / `query()` depuis `server/lib/db.js` |
| Schéma users | `ensureUsersSchema()` (CREATE IF NOT EXISTS + seed si vide) |
| CRUD users | `server/lib/usersStore.js` — pas de SQL ad hoc dans les routes UI |
| Requêtes | SQL paramétré (`execute` / `query(sql, params)`) — jamais concaténer des inputs |
| Schéma existant | Ne pas casser les colonnes réservées (magic link, `password_hash`) sans migration explicite |

### Diagnostic (shell, hors code)

Sur h1 uniquement, pour vérifier — **ne pas** en faire un pattern d’app :

```bash
# Health API (préféré)
curl -s http://127.0.0.1:7826/api/health

# Mot de passe (ne pas l’afficher dans le chat / les commits)
PASS=$(cat /apps/helm-v1/etc/mysql/localhost/passwd)
# mysql -u helm-v1 -p"$PASS" helm-v1   # inspection manuelle seulement
```

---

## Ports & process (ne pas confondre avec cursorauto)

| Service | PM2 | Port |
|---------|-----|------|
| Vite HMR | `helm-vite` | **7823** |
| Express API | `helm-api` | **7826** |
| Bridge CLI | (séparé) | **4200** |

cursorauto = **7623** / **7626** / ca.xavdp.pro — hors périmètre.

---

## Helm Voice

| Élément | Règle |
|---------|-------|
| TTS | **Cartesia Sonic** ou **Deepgram Aura** (`TTS_PROVIDER`) — WS stream `/api/voice/tts-stream` |
| STT | **Deepgram** Nova live WS (`DEEPGRAM_API_KEY`, `DEEPGRAM_STT_MODEL=nova-3`) |
| Émotions | tags Sonic `[calm]`, `[excited]`, … → `generation_config.emotion` |
| Agent Cursor | directive inject via `applyCursorLanguage` (tags Sonic si Cartesia) |
| Admin | https://helm.xavdp.pro/admin/voices — catalogue gratuit FR/ES/EN |

---

## Auth (état actuel)

| Couche | Règle |
|--------|-------|
| Login | Auth par user (email + bcrypt) — pas de `APP_PASSWORD` |
| JWT | Cookie `ca_token` (`sub`, `email`, `name`, `role`) |
| Users BDD | CRUD admin réel — voir [`AUTH-USERS.md`](./AUTH-USERS.md) |
| Suite | Magic links + rôles sur routes admin — **à faire** |

---

## Suite prioritaire

Auth email/mdp (+ magic links plus tard) → voix mobile → WebSocket desk → POC CRM → Docker (plus tard).
