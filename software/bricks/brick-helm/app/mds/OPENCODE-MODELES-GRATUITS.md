# OpenCode — modèles gratuits (sans clé Claude)

Quand **agy** est à quota et qu’on **ne veut pas** de `ANTHROPIC_API_KEY` / Claude : lancer **OpenCode** sur les modèles **Zen free**.

Doc officielle : [opencode.ai/docs/zen](https://opencode.ai/docs/zen/).  
Le bridge existe désormais : `/opt/bridge/opencode`, port **4340** sur gbs-tools
(dépôt propre : [opencode-bridge](https://github.com/xavdp-pro/opencode-bridge)).
Helm l’enregistre par défaut, au même titre que `cursor` et `agy`.
Ce document couvre l’usage **CLI direct** ; pour la console, passer par le bridge.

---

## Ce qu’il ne faut **pas** mettre

| Variable | Pourquoi |
|----------|----------|
| `ANTHROPIC_API_KEY` / `CLAUDE_API_KEY` | Claude payant — **inutile** pour les modèles free |
| `GEMINI_API_KEY` | Mélange avec agy / Gemini free-tier |
| Clé OpenAI | Modèles payants Zen |

Pas de login Claude. Les IDs `*-free` et `big-pickle` sont à **0 $** côté Zen (période limitée, roster qui change).

---

## Install (si `opencode` absent)

```bash
curl -fsSL https://opencode.ai/install | bash
# binaire typique : ~/.opencode/bin/opencode
export PATH="$HOME/.opencode/bin:$PATH"
opencode --version
```

---

## Lister les modèles provider `opencode`

```bash
opencode models opencode
```

Chercher les lignes `*-free` et `big-pickle`.

---

## Lancer **sans** clé Claude

```bash
# Test
opencode run --model opencode/big-pickle "Reply with the single word PONG"

opencode run --model opencode/deepseek-v4-flash-free "Explain this repo in 5 bullets"
opencode run --model opencode/mimo-v2.5-free "Review this file for bugs"
```

TUI :

```bash
opencode
# /models → choisir opencode/big-pickle ou un *-free
```

Config (`~/.config/opencode/opencode.jsonc`) — **pas** de clé Anthropic :

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/big-pickle",
  "small_model": "opencode/deepseek-v4-flash-free"
}
```

---

## Modèles gratuits (Zen, août 2026)

IDs CLI = `opencode/<id>`. Source : [Zen](https://opencode.ai/docs/zen/).

| Nom | ID | Notes |
|-----|-----|--------|
| Big Pickle | `big-pickle` | Stealth, coding général |
| DeepSeek V4 Flash Free | `deepseek-v4-flash-free` | Rapide |
| MiMo-V2.5 Free | `mimo-v2.5-free` | Coding |
| Hy3 Free | `hy3-free` | Période limitée |
| Laguna S 2.1 Free | `laguna-s-2.1-free` | Période limitée |
| Nemotron 3 Ultra Free | `nemotron-3-ultra-free` | NVIDIA trial — **pas de secrets perso** |
| Nemotron 3.5 Lightning Free | `nemotron-3.5-lightning-free` | idem NVIDIA |

Les `claude-*`, `gpt-*`, `gemini-*` Zen sont **payants** (clé Zen ou provider) — ne pas les prendre si on refuse une API.

Si `opencode run` demande un login Zen uniquement pour un `*-free`, réessayer `big-pickle` / `deepseek-v4-flash-free`. Ce n’est **toujours pas** une clé Claude.

---

## HTTP OpenAI-compatible (sans Anthropic)

Endpoint Zen (modèles free, même famille `chat/completions`) :

```text
https://opencode.ai/zen/v1/chat/completions
```

Exemple (si une clé **OpenCode Zen** existe — ce n’est pas Claude) :

```bash
curl -sS https://opencode.ai/zen/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENCODE_ZEN_KEY" \
  -d '{
    "model": "big-pickle",
    "messages": [{"role":"user","content":"PONG only"}]
  }'
```

Pour l’agent qui gèle : **préférer le CLI** `opencode run --model opencode/big-pickle` — souvent **sans** `opencode auth login` sur ces IDs.

Liste JSON : `https://opencode.ai/zen/v1/models`

---

## vs agy (rappel)

| | agy | OpenCode free |
|--|-----|----------------|
| Auth | Google OAuth + `AQ.` | Pas Claude ; souvent pas de clé |
| Helm HTTP | `http://127.0.0.1:4340` | opencode-bridge, service `opencode-bridge.service` |
| Quota actuel | Individual quota ~107 h | Indépendant du compte Google agy |

Ne pas mixer `ANTHROPIC_*` dans l’environnement du process `opencode`.
