# Claude Code natif + Remote Control (sans LiteLLM)

Permet de piloter **Claude Code sur gbs-h1** depuis l'**app mobile Claude**
(onglet **Code**) avec **Sonnet** ou **Opus** Anthropic directs — pas via LiteLLM.

## Deux modes Claude sur helm-v2

| Mode | Usage | Modèles | Mobile |
|------|-------|---------|--------|
| **Bridge + LiteLLM** | KovZu UI (`inject` / tâches maestro) | OpenRouter, Ollama, Kimi… | Non |
| **Natif + Remote Control** | Session locale `claude remote-control` | Sonnet, Opus, Haiku (abonnement) | Oui — onglet Code |

Remote Control **ne fonctionne pas** si `ANTHROPIC_BASE_URL` pointe vers LiteLLM
(voir [doc Anthropic](https://code.claude.com/docs/en/remote-control)).

## Prérequis (une fois)

**Depuis Helm (recommandé)** — Admin → CLI → **Claude natif — Remote Control** :

1. Clique **« Ouvrir la connexion Claude »** → un onglet s'ouvre sur claude.com
2. Connecte-toi avec ton abonnement
3. Copie le **code** affiché et colle-le dans Helm
4. Statut → **Connecté**

**En terminal** (alternative) :

```bash
runuser -u helm-v2 -- env HOME=/apps/helm-v2 \
  PATH=/opt/bridge/claude/bin:$PATH claude auth login --claudeai
```

Vérifier :

```bash
runuser -u helm-v2 -- env HOME=/apps/helm-v2 \
  PATH=/opt/bridge/claude/bin:$PATH claude auth status
# → "loggedIn": true
```

## Lancer une session visible sur mobile

```bash
cd /apps/helm-v2/app

# Sonnet (défaut) — mode serveur, QR code + liste dans l'app
npm run claude:remote

# Opus
npm run claude:remote -- opus

# Terminal interactif + mobile en parallèle
npm run claude:remote -- sonnet --interactive
```

Équivalent direct :

```bash
bash /opt/bridge/claude/scripts/native-remote-control.sh sonnet /apps/helm-v2/app
```

## Sur le téléphone

1. Ouvre l'app **Claude** (Android / iOS)
2. Onglet **Code**
3. La session **« KovZu — Sonnet »** (ou Opus) apparaît avec un point vert
4. Ou scanne le **QR code** affiché dans le terminal (touche Espace)

Dans une session déjà ouverte : `/remote-control` ou `/rc` pour l'activer.

## Nom de session

Par défaut : `KovZu — Sonnet` / `KovZu — Opus`.

Personnaliser :

```bash
CLAUDE_RC_NAME="helm-v2 debug" npm run claude:remote
```

## Fichiers

| Chemin | Rôle |
|--------|------|
| `/opt/bridge/claude/scripts/native-remote-control.sh` | Lanceur (nettoie env LiteLLM) |
| `/opt/bridge/claude/templates/claude-settings.native.json` | Settings sans gateway |
| `scripts/claude-native-remote.sh` | Wrapper helm-v2 |
| `/opt/bridge/claude/.env` | **Uniquement** pour le bridge headless — ne pas sourcer pour RC |

## Ne pas confondre

- `claude-bridge` (:4320) + LiteLLM (:4330) → reste pour **KovZu** (inject HTTP)
- `claude remote-control` → **session humaine** visible sur mobile, modèles Anthropic natifs
