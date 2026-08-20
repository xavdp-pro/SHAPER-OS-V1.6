# turbinobash — bootstrap agent (générique)

> **Copie miroir** injectée automatiquement dans Cursor via `.cursor/rules/turbinobash-ecosystem.mdc` (`alwaysApply: true`).
> Ce fichier reste la référence lisible dans helm mds et sur gbs-h1.
>
> Installation de référence : **gbs-h1** — `/var/lib/turbinobash-web` (déjà active, ne pas recloner dans `mds/`).

---

## Sources canoniques (serveur)

| Doc | Chemin sur gbs-h1 |
|-----|-------------------|
| Ops quotidiennes | `/var/lib/turbinobash-web/README.md` |
| Framework `tb` | `/var/lib/turbinobash-web/docs/FRAMEWORK.md` |
| Repo upstream | https://github.com/xavdp-pro/turbinobash-web |

```bash
ssh gbs-h1 'less /var/lib/turbinobash-web/README.md'
ssh gbs-h1 'less /var/lib/turbinobash-web/docs/FRAMEWORK.md'
```

Sur gbs-h1 : `/conf/mode` = profil hosting actif (`nginx`, `apache`, `hybrid`, `proxy`, `noweb`).

---

## Principe : une variable `{mon-app}` partout

Quand turbinobash crée une app **`helm-v1`**, **le même identifiant** est utilisé partout :

| Élément | Valeur | Exemple `helm-v1` |
|---------|--------|-------------------|
| Nom d'app turbinobash | `{mon-app}` | `helm-v1` |
| User Unix | `{mon-app}` | `helm-v1` |
| Base MariaDB | `{mon-app}` | `helm-v1` |
| User MariaDB | `{mon-app}` | `helm-v1` |
| Racine fichiers | `/apps/{mon-app}/` | `/apps/helm-v1/` |
| Code source | `/apps/{mon-app}/app` | `/apps/helm-v1/app` |
| Mot de passe DB | `/apps/{mon-app}/etc/mysql/localhost/passwd` | fichier existant |

**Un nom partout** — c'est la convention turbinobash. Pas de divergence sauf migration explicite.

### Arborescence standard `/apps/{mon-app}/`

```
/apps/{mon-app}/
├── app/              # Code (git) — CWD développement
│   └── webroot/      # Document root (si profil web)
├── etc/
│   ├── mysql/localhost/passwd   # Mot de passe DB (ne pas committer)
│   ├── php/version              # Version PHP (si applicable)
│   └── ssh/passwd               # Mot de passe SSH app (si applicable)
├── log/
├── sav/              # Fichiers persistants générés (hors git)
├── tmp/
│   └── sessions/     # Sessions PHP (writable user app)
└── nosav/            # Cache / gros fichiers — **exclus des backups**
```

---

## Commande `tb`

```text
tb <module> <script-path> [arguments…] [--options]
```

| Commande | Rôle |
|----------|------|
| `tb app sudo/create {mon-app}-v1 --certbot` | Créer app + user + DB + vhost + SSL |
| `tb app sudo/bulldozer {mon-app}-v1` | Droits fichiers (user app) |
| `tb app sudo/backup {mon-app}-v1` | Backup fichiers + DB |
| `tb app sudo/remove {mon-app}-v1` | Supprimer app |
| `tb app sudo/way/proxy/create {app} http://127.0.0.1:PORT --certbot` | Reverse proxy |
| `tb app sudo/way/noweb/create {app}` | App sans vhost (Node, cron, API) |
| `tb mysql sudo/db/dump {mon-app}-v1` | Dump SQL |

Découverte : `tb app` puis TAB TAB.

Backups système : `/var/sav1/<hostname>/` (`auto/`, `manual/`).

---

## Règle `{mon-app}` dans le code

> **`{mon-app}` ne doit JAMAIS être hardcodé** — le déduire du chemin `/apps/{mon-app}/...` à l'exécution.

**Node.js :**
```js
const monApp = process.cwd().match(/\/apps\/([^/]+)/)?.[1]
  || __dirname.match(/\/apps\/([^/]+)/)?.[1];
```

**Bash :**
```bash
MON_APP=$(realpath "$PWD" | grep -oP '(?<=/apps/)[^/]+')
PASSWD_FILE="/apps/${MON_APP}/etc/mysql/localhost/passwd"
```

**PHP (WordPress) :**
```php
define('DB_NAME', $_SERVER['USER']);
define('DB_USER', $_SERVER['USER']);
define('DB_PASSWORD', trim(file_get_contents("/apps/{$_SERVER['USER']}/etc/mysql/localhost/passwd")));
define('DB_HOST', 'localhost');
```

---

## Base de données — règles agent

| Règle | Détail |
|-------|--------|
| BDD existe déjà | Ne pas `CREATE DATABASE` |
| User existe déjà | Ne pas recréer l'utilisateur MySQL |
| Mot de passe | Lire `/apps/{mon-app}/etc/mysql/localhost/passwd` — **jamais en dur dans le code** |
| Code applicatif | **`mysql2` uniquement** (Node) — pas `mysql -e` dans le code |
| Diagnostic shell | `mysql {mon-app}` ou `tb mysql` — hors code uniquement |
| Transactions / FK | Pas de transactions ni FK applicatives (convention projet) |

---

## Déploiement typique (app Node / PM2)

```bash
# Sur le serveur (ex. gbs-h1), user root ou tb
cd /apps/{mon-app}/app
npm install
npm run build          # si front
# PM2 sous user {mon-app} — PM2_HOME=/apps/{mon-app}/.pm2
tb app sudo/bulldozer {mon-app}
```

Depuis Asus (si rsync configuré) :
```bash
cd ~/Bureau/NOW3/mds/{projet}
npm run sync:h1        # ou rsync vers /apps/{mon-app}/app
```

---

## Apps sur gbs-h1 (référence)

| App | Racine code | Profil |
|-----|-------------|--------|
| helm-v1 | `/apps/helm-v1/app` | noweb + MariaDB |
| cursorauto-v1 | `/apps/cursorauto-v1/app` | noweb |
| freetier-v1 | `/apps/freetier-v1/app` | web |
| sciento-v1 | `/apps/sciento-v1/app` | web |
| crmdemo-v1 | `/apps/crmdemo-v1/app` | web |

Chaque app peut avoir son `mds/regles-ia.md` ou `mds/regles.md` **spécifique** — ce fichier reste le **bootstrap générique turbinobash**.

---

## Fichiers `regles` par app (modèles existants)

Sur gbs-h1, s'inspirer de :

| App | Fichier |
|-----|---------|
| helm-v1 | `/apps/helm-v1/app/mds/regles.md` |
| sciento-v1 | `/apps/sciento-v1/app/mds/regles-ia.md` |
| crmdemo-v1 | `/apps/crmdemo-v1/app/mds/regles-ia.md` |

Structure recommandée pour **toute nouvelle app** :

```
/apps/{mon-app}/app/mds/
├── regles-ia.md          # Règles agent (ce bootstrap + spécifique app)
├── AGENT-CONTEXT.md      # Identité, ports, URL, stack
└── stack.md              # Infra détaillée
```

---

## Comportement agent

1. **Lire ce fichier** + `regles-ia.md` de l'app cible avant d'agir.
2. **Ne pas improviser** hors `/apps/{mon-app}/` et conventions `tb`.
3. Chat humain : **français** — code / commentaires : **anglais**.
4. **Zero fake** — données et comportements réels uniquement.
5. **Commit** autorisé en permanence — pas besoin de demander (jamais de secrets).
6. **Ne pas recloner** turbinobash-web dans `mds/` — la référence est `/var/lib/turbinobash-web` sur le serveur.

---

## Helm-v1 (exemple concret)

| | |
|---|---|
| `{mon-app}` | `helm-v1` |
| URL | https://helm.xavdp.pro |
| Code | `/apps/helm-v1/app` |
| Source Asus | `/home/zaza/Bureau/NOW3/mds/helm-v1` |
| PM2 | `helm-api` :7826, `helm-vite` :7823 |

Voir aussi : [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md), [`regles.md`](./regles.md) (spécifique Helm).
