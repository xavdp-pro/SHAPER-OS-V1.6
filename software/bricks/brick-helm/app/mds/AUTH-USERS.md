# Helm — utilisateurs & auth

> Voir aussi [`AGENT-CONTEXT.md`](./AGENT-CONTEXT.md) et [`VISION.md`](./VISION.md).

## État actuel

| Couche | État |
|--------|------|
| Login UI | Email (ou identifiant) + mot de passe |
| JWT cookie | `ca_token`, payload `{ sub, email, name, role }` |
| Table MariaDB `users` | CRUD admin + `password_hash` (bcrypt) |
| Compte démo | `TheSuperUser` / `thesuperuser@helm.local` (seed API) |
| Magic links | **Pas encore** — colonnes réservées |
| Garde rôle admin sur `/admin` | **Pas encore** |

## Login

`POST /api/auth/login` `{ email, password }` :

- Lookup par email, ou par `name` (ex. `TheSuperUser`), ou local-part `@helm.local`
- Vérifie `status === active` + `password_hash` (bcryptjs)
- Met à jour `last_login_at`
- Cookie HTTP-only `ca_token` (7 jours)

Bouton **Remplir le compte démo** sur `/` préremplit les champs (pas de magic link).

## Briefing opérateur

Champ `users.briefing` (TEXT) — présentation + consignes permanentes pour Cursor CLI.

| Moment | Comportement |
|--------|----------------|
| Session vide (1er open) | `POST /api/session/prime` injecte le briefing + demande un « bonjour » |
| Vidage conversation | `POST /api/session/clear` (orchestré : stop + timeline + reset + prime) |
| Reset manuel CLI | `POST /api/session/reset` avec `prime: true` |
| Édition / renvoi message | reset **sans** prime |

UI : `/admin/briefing` (soi-même) + champ sur fiche utilisateur admin.

## API

| Méthode | Path |
|---------|------|
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` — inclut `briefing` |
| PATCH | `/api/auth/me` — `{ name?, briefing? }` |
| POST | `/api/session/prime` |
| POST | `/api/session/clear` — `{ conversation }` — vidage complet orchestré |
| POST | `/api/session/reset` — `{ conversation, prime? }` |

## Admin (onglets bookmarkables)

| URL | Contenu |
|-----|---------|
| `/admin` | → `/admin/agent` |
| `/admin/agent` | Nom de l’agent IA |
| `/admin/briefing` | Briefing opérateur (présentation / consignes CLI) |
| `/admin/voices` | Voix TTS |
| `/admin/users` | Liste utilisateurs |
| `/admin/users/new` | Création (+ mot de passe optionnel) |
| `/admin/users/:id` | Modification |

Aussi : `GET/POST/PATCH/DELETE /api/users` (CRUD admin).

Toutes protégées par `authMiddleware` (session JWT).

## Schéma `users`

- `email`, `name`
- `role` : `admin` \| `operator` \| `viewer`
- `status` : `active` \| `pending` \| `disabled`
- `password_hash` — bcrypt (auth actuelle)
- `briefing` — présentation / consignes Cursor CLI (sessions)
- `magic_token_hash`, `magic_token_expires_at` — réservés magic links
- `last_login_at`, `notes`, timestamps

Seed au démarrage API : upsert admin démo `TheSuperUser` (+ briefing démo si vide).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `server/lib/db.js` | Pool mysql2 + `ensureUsersSchema` + seed démo |
| `server/lib/password.js` | bcrypt hash / verify |
| `server/lib/demoAdmin.js` | Identifiants seed démo |
| `server/lib/sessionPrime.js` | Message de démarrage session (briefing + bonjour) |
| `server/lib/usersStore.js` | CRUD + `findUserForAuth` |
| `server/routes/auth.js` | Login / logout / me |
| `server/routes/session.js` | Reset / prime / stop |
| `server/routes/users.js` | Routes Express users |
| `src/pages/Login.jsx` | UI login + bouton démo |
| `src/pages/admin/AdminBriefing.jsx` | Édition de son briefing |
| `src/lib/demoCredentials.js` | Préremplissage front |
| `src/pages/admin/AdminUsers.jsx` | UI admin |

## Suite prévue

1. Magic link (mail + token hashé)
2. Appliquer `role` sur `/admin/*` (admin only)
3. Comptes démo supplémentaires / UX démo dédiée
