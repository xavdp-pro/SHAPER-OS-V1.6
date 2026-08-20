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

## External keys (tier-b) — browser-assisted

Read [`KEYS-AND-ACCOUNTS.md`](./KEYS-AND-ACCOUNTS.md). If the human asks for voice or a public URL:

1. Confirm tier-a is green (`npm run test:live`).
2. Use the IDE **browser** (if available) to open **one vendor site at a time**:
   - Deepgram → https://console.deepgram.com/ → API Keys
   - Groq → https://console.groq.com/keys
   - Cloudflare tunnel → https://one.dash.cloudflare.com/ → Networks → Tunnels
3. Human pastes into `software/.env` or `sav/tunnel/token` — **never** into chat or git.
4. Deploy tier-b (`manifest.tier-b.json`, `WITH_HELM=1`) and run `npm run test:live:helm`.

Do **not** ask for Deepgram/Groq/Cloudflare during tier-a install.

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
# tier-b: npm run test:live:helm
```

Silence on unspecified ports = you may choose **if** brick INTENTs hold. You may **not** skip `test` or `test:live`.

---

## Forbidden

- Skip `npm test` or `npm run test:live`
- Commit `.env`, vault files, tunnel tokens, `*.enc`
- Default API keys in shell scripts
- Merge client UI into Helm
- Production mailboxes in DEV/TEST

---

## Done

[`PROOF.md`](./PROOF.md) + live tests green. On failure: stop and show the error.
