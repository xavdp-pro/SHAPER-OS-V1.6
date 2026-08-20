> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)

# Kit intent

## Objective

Give a Linux operator and an IDE agent enough intent to **install**, **prove**, and **keep** Shaper OS without weakening RULES.md — including fractal reuse, perimeters, and DEV / TEST / PROD.

## Invariants

1. This repository is **kit + software**. Runnable code lives in `./software/`. One clone is enough.
2. Technical text is **English**. Pair talk with the human may be French.
3. Secrets stay local. Never commit `.env`, vault files, or tunnel tokens.
4. First path: units (`npm test`) → images → deploy → health → **live tests** (`npm run test:live`) → voice/text proof. No skip. Live tests run **after** the stack is up, not before.
5. Generic bricks are reused; a universe only **specializes**. Never copy Containerfiles or packages into a universe.
6. Operator cockpit (`/console`) is perimeter 2. Client shops and CRM are perimeter 3 — never merged into the cockpit. Voice lives in `/console` if Helm is on — never revive `/talk` or `/voice`.
7. Laptop install is **DEV**. TEST rebuilds from scratch then is destroyed. PROD is created once and updated by **git tag**, not by vibe on the live box.
8. Mail and real customer data used in TEST/DEV must never be production mailboxes.

## Read first

[`START-HERE.md`](./START-HERE.md) then [`CONCEPTS.md`](./CONCEPTS.md) and [`LIFECYCLE.md`](./LIFECYCLE.md).
