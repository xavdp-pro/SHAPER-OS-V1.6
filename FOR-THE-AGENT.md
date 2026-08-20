# Instructions for the install agent

The human knows Linux and does not know Shaper OS.  
You execute **this single repository** (`software/` + universe folder). You do not invent a new architecture. You do not soften the law ([`LAW.md`](./LAW.md)).

First install = **DEV**. Not production.

---

## Read order

1. [`LAW.md`](./LAW.md)
2. [`START-HERE.md`](./START-HERE.md)
3. [`KEYS-AND-ACCOUNTS.md`](./KEYS-AND-ACCOUNTS.md) — which keys, which URLs, tier-a vs tier-b
4. This file
5. [`PROOF.md`](./PROOF.md)
6. `software/RULES.md` · `software/docs/PERIMETERS.md` · `software/topology.json`
7. Brick `INTENT.md` files listed in the universe manifest

Do not implement from obsolete docs. Do not add `/talk` or `/voice`.

---

## Layout

```
SHAPER-OS-V1.6/          ← repo root
├── software/            ← all packages, bricks, scripts
└── <univ_slug>-dev/     ← universe you create
```

If `software/packages` is missing: **stop**. You are not in the V1.6 monorepo.

Never copy `packages/` or brick `Containerfile`s into the universe folder.

---

## You generate

```bash
openssl rand -hex 32   # VAULT_MASTER_KEY
openssl rand -hex 24   # VAULT_TOKEN
```

Write `software/.env`. Never commit secrets. Never paste keys from old repos into `.env`.

---

## Strict `.env` Verification & Key Propagation (Vibe-Coding Contract)

Before launching any container, stack (`podman-up.sh`), or test suite:

1. **Inspect `.env` Completeness**:
   - Check if `.env` exists at repo root (`.env`), `software/.env`, or the universe folder.
   - Verify that all required keys for the target tier are present, non-empty, and NOT dummy placeholders.
2. **Proactive Key Reclamation (Mandatory Halt)**:
   - If any required key (`DEEPGRAM_API_KEY`, `GROQ_API_KEY`, `VAULT_MASTER_KEY`, `JWT_SECRET`, Cloudflare tunnel token) is missing or invalid: **HALT IMMEDIATELY**.
   - Do NOT proceed blindly to build or launch.
   - Explicitly ask the human vibe-coder for the missing key(s), provide the direct vendor console URL (see [`KEYS-AND-ACCOUNTS.md`](./KEYS-AND-ACCOUNTS.md)), and wait for the human to provide them.
3. **Multi-Podman Key Propagation**:
   - You are responsible for copying/syncing validated keys from the root `.env` into `software/.env` and all universe `deploy/*.env` files so every container boots with valid credentials.
4. **Standard vs Freestyle Guarantee**:
   - **Standard Recipe (100% Predictable)**: When all keys are complete and valid, the entire pipeline is guaranteed to be 100% deterministic and green from end to end.
   - **Freestyle Mode (User Responsibility)**: If the human chooses to run with partial/missing keys, warn them clearly of inactive features. Managing degraded modes in freestyle is the human-agent pair's responsibility.

---

## External keys (tier-b) — browser-assisted

Read [`KEYS-AND-ACCOUNTS.md`](./KEYS-AND-ACCOUNTS.md). If the human asks for voice or a public URL:

1. Confirm tier-a is green (`npm run test:live`).
2. Use the IDE **browser** (if available) to open **one vendor site at a time**:
   - Deepgram → https://console.deepgram.com/ → API Keys
   - Groq → https://console.groq.com/keys
   - Cloudflare tunnel → https://one.dash.cloudflare.com/ → Networks → Tunnels
3. Human pastes into `.env` or `software/.env` or `sav/tunnel/token` — **never** into chat or git.
4. Deploy tier-b (`manifest.tier-b.json`, `WITH_HELM=1`) and run `npm run test:live:helm`.

Do **not** launch tier-b with empty or invalid keys without explicitly prompting the human first.

## Pipeline (DEV) — do not reorder

```bash
# from repo root
cp .env.example software/.env
cp software/resources/vault-resources.dev.example.json software/resources/vault-resources.local.json
# fill generated vault keys in both files

cd software
npm run vault:bootstrap
npm test                          # packages only — MUST be green
bash scripts/build-all-bricks.sh

# Universe at ../<univ_slug>-dev/ (repo root)
# manifest.json from manifest.tier-a.json
# Copy examples/deploy/podman-up.sh → ../<univ_slug>-dev/deploy/podman-up.sh

cd ..
bash <univ_slug>-dev/deploy/podman-up.sh
# health must exit 0

cd software && npm run test:live   # tier-a — MUST be green
# tier-b verification:
node scripts/test-voice-player.mjs        # Strict closed-loop audio & 401 check (MUST be 100% green)
node scripts/test-e2e-business-flow.mjs   # Full 6-step autonomous business flow (MUST be 100% green)
```

Silence on unspecified ports = you may choose **if** brick INTENTs hold. You may **not** skip `test`, `test:live`, or closed-loop scripts.

---

## Non-Regression Invariants for Future Agents

1. **Deterministic Bridge Token Sync**: `podman-up.sh` always forces `OPENCODE_BRIDGE_TOKEN` from `.env` into `$UNIV/sav/opencode-bridge/token` so Helm and Bridge never mismatch tokens (`HTTP 502/401 Unauthorized`).
2. **Guaranteed Final Response (Anti-Silence)**: OpenCode `translate.mjs` must never emit empty text on `session.idle`. Aborted tools or model errors must be surfaced explicitly as the assistant's text response.
3. **Reborn (Session Prime)**: `/api/session/clear` resets the bridge session and immediately restores the Presentation Briefing ("Bonjour [Nom] ! Je suis Zephir...").

---

## Forbidden

- Skip `npm test`, `npm run test:live`, or `test-e2e-business-flow.mjs`
- Commit `.env`, vault files, tunnel tokens, `*.enc`
- Default API keys in shell scripts
- Merge client UI into Helm
- Production mailboxes in DEV/TEST
- Leave `session.idle` with empty response text (starving UI and TTS)

---

## Done

[`PROOF.md`](./PROOF.md) + live tests green. On failure: stop and show the error.
