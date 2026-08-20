# Brancher `agy` (Antigravity) avec une clé API

Pour un **autre agent** (autre machine, autre user Unix, process qui **gèle**) : ne pas coller une clé Gemini AI Studio dans `GEMINI_API_KEY`. C’est le bug qu’on a déjà eu sur helm-v2 / gbs-tools.

Référence live qui marche : **gbs-tools**, user `helm-v2`, bridge **`:4330`**.

---

## Procédure HTTP — l’autre agent parle au bridge (pas `agy` direct)

L’autre agent **ne lance pas** `agy`. Il appelle **HTTP** `127.0.0.1:4330` (même machine) ou un tunnel SSH vers ce port.

Token = fichier **bridge** (pas la clé `AQ.`) :

```text
/apps/helm-v2/.config/antigravity-bridge/token
```

### 1. Santé

```bash
TOKEN=$(cat /apps/helm-v2/.config/antigravity-bridge/token)

curl -sS -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:4330/api/health
# { "ok": true, "service": "antigravity-bridge" }

curl -sS -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:4330/api/status
```

### 2. Ouvrir le flux SSE **avant** d’injecter

```bash
curl -sS -N -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:4330/api/events?conversation=mon-agent"
```

Événements : `connected`, `inject`, `response` (tokens), `response_complete`, `run_complete`, `log`.

### 3. Envoyer le message

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation": "mon-agent",
    "message": "Bonjour",
    "model": "gemini-3.7-flash-low"
  }' \
  http://127.0.0.1:4330/api/inject
```

`conversation` = id stable (comme un salon). Même id = même workspace sous `/apps/helm-v2/ws/antigravity/<id>/`.

### 4. Depuis une autre machine

```bash
ssh -N -L 4330:127.0.0.1:4330 gbs-tools
# puis les curl ci-dessus sur http://127.0.0.1:4330
```

Dans Helm : `AGENT_PLUGINS=agy|http://127.0.0.1:4330|<token>`.

**Ne pas** mettre `AQ.` ni `GEMINI_API_KEY` dans le header HTTP. Seul `Authorization: Bearer <token-bridge>`.

Si `response_complete` a `"exit":1` et texte vide : quota / login Google du **process agy sur gbs-tools**, pas un bug HTTP.

**Contournement sans Claude :** OpenCode modèles gratuits — [`OPENCODE-MODELES-GRATUITS.md`](./OPENCODE-MODELES-GRATUITS.md) (`opencode run --model opencode/big-pickle`, **pas** de `ANTHROPIC_API_KEY`).

---

## 1. Deux clés, deux backends — ne pas mélanger

| Variable | Préfixe typique | Backend | Effet |
|----------|-----------------|---------|--------|
| **`ANTIGRAVITY_API_KEY`** | `AQ.` | Antigravity (compte Google / CLI `agy`) | **C’est celle-là** |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `AIza…` | **Gemini Developer API** (free-tier) | Quota **429**, modèles `*-flash-low` **inconnus**, agent qui **tourne dans le vide / gèle** |

Le script officiel **efface** Gemini au démarrage du bridge :

`/opt/bridge/antigravity/start-bridge.sh`

```bash
# AQ.* is an Antigravity key, not a Gemini Developer API key.
unset GEMINI_API_KEY
unset GOOGLE_API_KEY
```

Si tu laisses `GEMINI_API_KEY` dans le `.env` du **process `agy`**, le CLI force `modelProvider: gemini` → freeze / 429.

---

## 2. Où mettre la clé (agent headless)

HOME de l’agent = le user Unix qui lance `agy` (ex. `helm-v2` → `HOME=/apps/helm-v2`).

### A. Fichier bridge (recommandé)

`/opt/bridge/antigravity/.env` — **chmod 600**, user du bridge :

```bash
ANTIGRAVITY_BRIDGE_PORT=4330
ANTIGRAVITY_BRIDGE_BIND=127.0.0.1
ANTIGRAVITY_BIN=/opt/bridge/antigravity/bin/agy
ANTIGRAVITY_WS_BASE=/apps/<mon-app>/ws/antigravity
ANTIGRAVITY_MODEL=gemini-3.7-flash-low
ANTIGRAVITY_API_KEY=AQ.xxxxxxxx
```

Ne **pas** ajouter `GEMINI_API_KEY` ici.

### B. Fichier credentials du HOME agent

`~/.config/antigravity/credentials.json` (chmod 600) :

```json
{ "api_key": "AQ.xxxxxxxx" }
```

`start-bridge.sh` lit ce JSON si `ANTIGRAVITY_API_KEY` est vide.

### C. Login Google (souvent nécessaire en plus de la clé)

Le CLI peut dire `You are not logged into Antigravity` même avec une clé.

Sur gbs-tools on a recopié la session Google du desktop :

| Fichier | Rôle |
|---------|------|
| `$HOME/.gemini/antigravity-cli/antigravity-oauth-token` | OAuth CLI |
| `$HOME/.config/antigravity/credentials.json` | clé / creds |
| `$HOME/.gemini/antigravity-cli/settings.json` | modèle, effort, print |

Copie depuis une machine où `agy` **répond** déjà (**le même compte Google** que la clé `AQ.`), `chown` au user agent.

### D. Procédure — autre compte (quota plein sur le premier)

La clé `AQ.` **ne change pas** le compte facturé. `agy` utilise le **login Google** dans `antigravity-oauth-token`. Sans ce fichier → `authentication required`. Avec le token du compte à quota → `Individual quota reached`.

**Sur le PC où l’autre compte Antigravity est déjà connecté** (desktop Antigravity ou `agy` qui répond) :

```bash
# Linux / user qui a ouvert Antigravity
ls -l ~/.gemini/antigravity-cli/antigravity-oauth-token
# parfois aussi :
ls -l ~/.config/antigravity/credentials.json
```

Copier **en privé** (scp, pas de chat, pas de git) vers gbs-tools, user `helm-v2` :

```bash
# depuis le PC source (exemple)
scp ~/.gemini/antigravity-cli/antigravity-oauth-token \
  gbs-tools:/tmp/agy-oauth-new
```

**Sur gbs-tools** (root / agent) :

```bash
HOME_AGY=/apps/helm-v2
install -o helm-v2 -g helm-v2 -m 600 /tmp/agy-oauth-new \
  "$HOME_AGY/.gemini/antigravity-cli/antigravity-oauth-token"
rm -f /tmp/agy-oauth-new

# clé AQ. du MÊME compte (déjà dans /opt/bridge/antigravity/.env)
# ne pas laisser GEMINI_API_KEY

systemctl --user --machine helm-v2@ restart antigravity-bridge
```

**Test** (ne doit plus dire quota / auth) :

```bash
sudo -u helm-v2 -H env HOME=/apps/helm-v2 PATH=/opt/bridge/antigravity/bin:$PATH \
  timeout 45 agy -p 'Reply with the single word PONG' \
  --model gemini-3.7-flash-low --output-format text \
  --print-timeout 30s --dangerously-skip-permissions
```

Si le desktop est **Windows** : le token est souvent sous  
`%USERPROFILE%\.gemini\antigravity-cli\antigravity-oauth-token`.

`settings.json` **ne doit pas** forcer Gemini :

```json
{
  "dangerouslySkipPermissions": true,
  "effort": "low",
  "model": "gemini-3.7-flash-low",
  "outputFormat": "stream-json"
}
```

**Interdit** : `"modelProvider": "gemini"`.

---

## 3. Modèles (sinon ça gèle ou « invalid model »)

En mode Antigravity, le `--model` a un **suffixe d’effort** :

| Famille UI | ID à passer à `agy` |
|------------|---------------------|
| Gemini 3.7 Flash low | `gemini-3.7-flash-low` |
| Gemini 3.6 Flash low | `gemini-3.6-flash-low` |
| Gemini 3.1 Pro | `gemini-3.1-pro-low` |

Helm normalise : `gemini-3.7-flash` → `gemini-3.7-flash-low` (`server/lib/agentAdapters/agy.js`).

Un autre agent qui envoie `gemini-3.7-flash` **sans** `-low` peut rester bloqué.

Vérif :

```bash
sudo -u <user-agent> -H env HOME=/apps/<mon-app> \
  ANTIGRAVITY_API_KEY='AQ.…' \
  PATH=/opt/bridge/antigravity/bin:$PATH \
  agy models
```

---

## 4. Brancher un autre agent sur le même `agy`

Même binaire, **HOME / workspace / port** séparés.

```
Navigateur / bot
    → ton API
    → antigravity-bridge  127.0.0.1:PORT
    → spawn  agy -p "…" --model gemini-3.7-flash-low --output-format stream-json
```

1. Installer le CLI : `/opt/bridge/antigravity/bin/agy`
2. Copier `/opt/bridge/antigravity/` (server.mjs, start-bridge.sh) ou réutiliser le process existant **:4330** si c’est la même machine
3. Token HTTP du bridge (pas la clé Google) :

```text
/apps/<mon-app>/.config/antigravity-bridge/token
```

Helm :

```bash
AGENT_PLUGINS=agy|http://127.0.0.1:4330|<token-bridge>
DEFAULT_AGENT_PLUGIN=agy
ANTIGRAVITY_BRIDGE_URL=http://127.0.0.1:4330
```

Le **token bridge** authentifie KovZu ↔ Node. La **clé `AQ.`** authentifie `agy` ↔ Google.

---

## 5. Pourquoi l’autre agent gèle (checklist)

1. `GEMINI_API_KEY` ou `GOOGLE_API_KEY` dans l’environnement du process `agy`
2. `modelProvider: "gemini"` dans `settings.json`
3. Modèle sans `-low` / `-medium` / `-high`
4. Pas de login Google (`antigravity-oauth-token` absent) → auth silencieuse qui ne finit jamais
5. HOME faux : `agy` écrit dans `/root/.gemini` au lieu de `/apps/<app>/`
6. Mode print froid : chaque `-p` relance process + language server + silent auth (**2–8 s** min, pas un freeze infini)

systemd (exemple helm-v2) :

```ini
Environment=HOME=/apps/helm-v2
ExecStart=/bin/bash /opt/bridge/antigravity/start-bridge.sh
```

---

## 6. Test (sans secrets dans le chat)

```bash
TOKEN=$(cat /apps/<mon-app>/.config/antigravity-bridge/token)

curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:4330/api/status
# → "service":"antigravity-bridge","ready":true

curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"conversation":"diag-agy","message":"Réponds uniquement: PONG","model":"gemini-3.7-flash-low"}' \
  http://127.0.0.1:4330/api/inject
```

Écouter le SSE `GET /api/events?conversation=diag-agy` : `response_complete` + `exit: 0`.

Print direct (doit répondre, pas rester ouvert) :

```bash
timeout 45 agy -p 'Reply with the single word PONG' \
  --model gemini-3.7-flash-low \
  --output-format text \
  --print-timeout 30s \
  --dangerously-skip-permissions
```

Si ça hang > 45 s : revérifier §1 et §5.

---

## 7. Chemins gbs-tools (référence qui marche)

| Élément | Chemin |
|---------|--------|
| Binaire | `/opt/bridge/antigravity/bin/agy` |
| Bridge | `/opt/bridge/antigravity/server.mjs` |
| `.env` clé | `/opt/bridge/antigravity/.env` |
| HOME agent | `/apps/helm-v2` |
| Token HTTP | `/apps/helm-v2/.config/antigravity-bridge/token` |
| Unit | `systemctl --user --machine helm-v2@ status antigravity-bridge` |
| Port | **4330** (sur gbs-tools = Antigravity, **pas** LiteLLM) |

Helm KovZu : plugin `agy`, modèle `gemini-3.7-flash-low`. Testé 18 août 2026 : inject `AGY-PONG-18` OK.
