# SHAPER OS V1.6

## Step 0 — Feed this repo to your AI agent (do this first)

Shaper OS is installed **with** an IDE agent (Cursor, Claude Code, etc.) — not by hand-copying a 50-step tutorial.

1. **Clone** and open the folder in your IDE:

   ```bash
   git clone https://github.com/xavdp-pro/SHAPER-OS-V1.6.git
   cd SHAPER-OS-V1.6
   ```

2. **Paste this intent** to your agent (full version: [`examples/agent-KEY-COLLECTION-INTENT.md`](./examples/agent-KEY-COLLECTION-INTENT.md)):

   > You are my Shaper OS install agent. Read `LAW.md`, `START-HERE.md`, `FOR-THE-AGENT.md`, and `KEYS-AND-ACCOUNTS.md`. Generate vault keys locally. Tell me which external API keys I need. For each one, open the correct vendor page (use your browser tool) and guide me step by step. Write secrets only to `software/.env` — never to git. Then run the install pipeline and stop on any red test.

3. **Let the agent work:**
   - **Tier-a (local DEV):** agent generates `VAULT_MASTER_KEY` + `VAULT_TOKEN` — **no paid signups**
   - **Tier-b (voice + public URL, later):** agent opens the right sites and helps you paste Deepgram, Groq, Cloudflare keys

**All vendor URLs and checklists:** [`KEYS-AND-ACCOUNTS.md`](./KEYS-AND-ACCOUNTS.md)

| Tier | External signups | Agent opens |
| :--- | :--- | :--- |
| **a — local stack** | None | — (generates vault keys with `openssl`) |
| **b — voice + tunnel** | Deepgram, Groq, Cloudflare | [Deepgram console](https://console.deepgram.com/) · [Groq keys](https://console.groq.com/keys) · [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) |

OpenCode free models need **no API key** for tier-a — see [OpenCode Zen](https://opencode.ai/docs/zen/).

---

**One pillar. Your business. Your assistant.**

Install once on **your** Linux machine. Then shape what you actually need — ERP, CRM, online shop, association back-office, automations, voice cockpit — with an **AI assistant dedicated to your context**, not a generic chatbot.

**Full install path:** [`START-HERE.md`](./START-HERE.md) · **Agent instructions:** [`FOR-THE-AGENT.md`](./FOR-THE-AGENT.md)

**See it applied to real businesses:** [shaper.xavdp.pro](https://shaper.xavdp.pro)

---

## In 30 seconds

| | |
| :--- | :--- |
| **What it is** | A small **operating system** for agents that *do work* — secrets, audit log, jobs, scheduler, optional voice console |
| **What it is not** | A fixed CRM, a fixed ERP, or ChatGPT in a tab |
| **What you get** | A **foundation** you own; on top, **your** tools — limited only by your process and imagination |
| **Who it is for** | Owner, association, freelancer, small team — anyone who outgrew spreadsheets + ten SaaS tabs |

You talk or type. The agent reads **your** context, acts (or queues work), logs everything, answers. Screens are optional.

---

## The pillar — then whatever you need

Shaper OS is the **technical floor** you do not rebuild for every project:

- Encrypted **vault** (API keys, mail, integrations)
- **Audit log** (who did what, when)
- **Job queue** + **scheduler** (background work, beats, follow-ups)
- **AI bridge** wired to **your** business rules (`AGENT-CONTEXT.md`)
- Optional **operator console** + voice (`/console`) — for you, not for your end customers

On that floor you — or an IDE agent — **shape the tool you lack today**:

- Something **ERP-like** — stock, orders, suppliers, invoicing
- A **CRM** — clients, pipeline, projects, mail triage, follow-ups
- An **online shop** or catalog — products, payments, fulfillment hooks
- **Association / NGO back-office** — members, dues, events, volunteers
- **Automations** — imports, alerts, recurring reports, syncs between tools you keep
- **Voice ops** — “what’s overdue?”, “queue this sync”, “summarize yesterday”
- A **weird vertical** no SaaS fits — your exceptions stay first-class

Same bricks underneath. New **universe** = new manifest + data + your rules — not a new SaaS subscription.

---

## Concrete examples (same pillar, different businesses)

| You need… | What you shape on top | The pillar handles… |
| :--- | :--- | :--- |
| **Light ERP** | Orders, stock, billing, supplier CSV | Secrets, jobs, audit, scheduled sync |
| **CRM / freelance hub** | Clients, projects, IMAP, follow-ups | Mail beats, queue, agent, console |
| **Online shop** | Catalog, Stripe, orders, shipping status | Vault, logger, web app (your code, your brand) |
| **Association / club** | Members, dues, events, mailing lists | Scheduler, audit, optional public site separate from console |
| **Field service (construction, maintenance)** | Quotes, sites, photos, planning | Voice console + mobile-friendly app you build |
| **Phone reception / booking** | Voice → slot → confirm → log | Bridge + queue + your booking app |
| **Training / coaching business** | Courses, payments, CMS, certificates | Universe pattern + Stripe + content |
| **“Nothing fits us”** | Exact workflow, your language, your edge cases | Fractal reuse — imagination is the limit |

**Duplicate** a proven setup for a second brand or client. **Rebuild TEST from zero** to prove disaster recovery. **Tag PROD** when tests are green.

Client-facing shops and portals stay **your apps** (perimeter 3). The operator cockpit stays **yours** (perimeter 2). Secrets and boot stay **boring and reliable** (perimeter 1).

---

## What’s in this repository

```
SHAPER-OS-V1.6/
├── START-HERE.md, LAW.md, …     ← install kit
├── software/                    ← packages, bricks, npm test, build scripts
└── <your-universe>-dev/         ← you create this (config + data only)
```

**Tier-a (local DEV):** vault · logger · OpenCode bridge · queue · maestro  
**Tier-b (optional):** Helm `/console` + voice · Cloudflare tunnel  

Everything for a first install is **here** — no second private repo required (V1.6).

---

## Security (useful paranoia, not theatre)

| We do | We don’t |
| :--- | :--- |
| Agent-generated vault keys; **no secrets in git** | Hardcoded API keys in scripts |
| Encrypt secrets · log every agent action | Trust the LLM with raw passwords in chat |
| Tests green **before** deploy; live tests **after** stack up | Skip failing tests or stub to green |
| DEV/TEST use stubs or dedicated mailboxes | Point tests at production inboxes |
| Data on **your** volumes / your VPS | Lock you into one vendor’s cloud |

Honest scope: this stops sloppy deploys, leaked repos, and architecture drift — not a nation-state on your LAN. Voice/tier-b uses **your** Deepgram/Groq keys and tunnel token locally.

Law: [`LAW.md`](./LAW.md) · [`software/RULES.md`](./software/RULES.md)

---

## From GitHub to your business

| Here (GitHub) | There ([shaper.xavdp.pro](https://shaper.xavdp.pro)) |
| :--- | :--- |
| Open pillar — install, test, fork the method (CC BY-SA 4.0) | Human conversation → **your** foundation shaped for **your** activity |
| For builders and IDE agents | For owners who want a tool that fits — delegation or autonomy |
| `git clone` + green tests | Live demo, discovery call, concrete path forward |

Same idea: **foundation first, then build on top** — ERP, CRM, shop, association tool, automation — until it matches how you really work.

**Looking for short- and long-term missions** — install, shape, or operate Shaper OS for your business (infra, ERP/CRM, shop, automation, voice).  
**Contact:** [xavier@xavdp.pro](mailto:xavier@xavdp.pro) · [LinkedIn](https://www.linkedin.com/in/xavier-de-poorter) · [shaper.xavdp.pro](https://shaper.xavdp.pro)

---

## Quick start

```bash
git clone https://github.com/xavdp-pro/SHAPER-OS-V1.6.git
cd SHAPER-OS-V1.6
cp .env.example software/.env
# IDE agent: generate VAULT_MASTER_KEY + VAULT_TOKEN — see START-HERE.md
cd software && npm run vault:bootstrap && npm test
bash scripts/build-all-bricks.sh
# then universe + podman-up — full path in START-HERE.md
```

**Read order:** [`LAW.md`](./LAW.md) → [`START-HERE.md`](./START-HERE.md) → [`PROOF.md`](./PROOF.md) → [`CONCEPTS.md`](./CONCEPTS.md)

---

## Not much business code — it runs on written intent

This repo **does** ship tested foundation code (vault, logger, queue, scheduler, bridge).  
What it **does not** ship is a fixed ERP, CRM, or shop as thousands of lines of app logic.

**Your business tool is mostly text files.** You declare *what* you want and *what must never happen*. An IDE agent (or you) reads those files and **generates or adapts the code at deploy time**. When the model improves, the intent stays; only the synthesis changes.

> **Human declares intent, rules, and invariants — the agent materializes the code.**

That is the core of the [manifest model](./software/MANIFESTO.md).

### Manifest stack (one universe = one folder)

| File | Who reads it | What it says |
| :--- | :--- | :--- |
| **`INTENT.md`** | Deploy agent | Objective + 4–6 invariants (security, logging, lifecycle) |
| **`manifest.json`** | Scripts + deploy agent | Which bricks to wire, boot order, where to specialize (vault file, task JSON, volumes) |
| **`AGENT-DEPLOY.md`** | Deploy agent | What it may do autonomously on this machine |
| **`context/AGENT-CONTEXT.md`** | Runtime assistant | Your business rules, tone, workflows — **not** install instructions |

**Deploy order:** `INTENT.md` → `manifest.json` → `AGENT-DEPLOY.md`  
**Runtime order:** beats / jobs read `AGENT-CONTEXT.md` only

### What `manifest.json` contains (summary)

A universe manifest is a short JSON contract — not a codebase:

- **`bricks`** — reusable engines already in `software/bricks/` (vault, logger, bridge, queue, maestro, optional helm…)
- **`ref` + `intent`** — pointer to each brick and its own `INTENT.md`
- **`specialize`** — *your* parameters only: vault bootstrap path, log volume, maestro tasks file, model choice
- **`bootOrder`** — which services start together and in what sequence

Example tier-a manifest: [`manifest.tier-a.json`](./manifest.tier-a.json) — five bricks, no copy of their source.

New CRM, new shop, new association back-office = **new universe folder** (intent + manifest + context + data). Same pillar underneath. Containers and glue code are **disposable**; structure, data, and declared intent are **permanent**.

Full doctrine: [`software/MANIFESTO.md`](./software/MANIFESTO.md) · architecture: [`software/docs/UNIVERSE-ARCHITECTURE.md`](./software/docs/UNIVERSE-ARCHITECTURE.md)

---

**Author:** Xavier DE POORTER / XDP LLC · **Missions:** short & long term — [xavier@xavdp.pro](mailto:xavier@xavdp.pro) · [LinkedIn](https://www.linkedin.com/in/xavier-de-poorter) · **License:** [CC BY-SA 4.0](./LICENSE)  
**AI-assisted:** see [`NOTICE.md`](./NOTICE.md)
