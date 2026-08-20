# 🌌 SHAPER OS — Autonomous Sovereign Business Operating System

> **Publisher**: XDP | ADVANCED DYNAMIC IA SYSTEM LLC (USA)  
> **Founder**: Xavier DE POORTER ([shape.xavdp.pro](https://shape.xavdp.pro) / [shaper-os.xavdp.pro](https://shaper-os.xavdp.pro))  
> **Infrastructure**: Bare-Metal Proxmox & Debian 13 Hosts, WireGuard Private Mesh (`10.87.78.0/24`)

---

## 🧭 1. Architectural Philosophy

**SHAPER OS** is a fractal, modular, and sovereign software factory engineered to allow humans and AI agents to design, assemble, deploy, and restore any vertical business application with **cold-boot PRA < 120s**.

### Core Directives

1. **Decoupled Fractal LEGO Bricks (`@shaper/*`)**: Isolated ESM packages with native unit tests (`node --test`).
2. **Zero Idle Token Waste**: Agents wake on deterministic events (Maestro beats, IMAP checks, voluntary queue jobs) — not idle polling.
3. **Total Sovereignty**: Podman / LXC, local vault AES-256-GCM, self-hosted DB on demand.
4. **Triumvirate Lifecycle**: `DEV` → ephemeral `TEST` (PRA from scratch, then destroy) → `PROD` hot-update by tag.

### Three Perimeters (canonical law)

All components belong to **exactly one** perimeter. Full taxonomy: [`docs/PERIMETERS.md`](./docs/PERIMETERS.md).  
Documentation index: [`docs/DOC-INDEX.md`](./docs/DOC-INDEX.md).

| Perimeter | What | Examples |
| :--- | :--- | :--- |
| **P1 — Minimal socle** | Secrets, audit, auth, boot, generic queue | `@shaper/vault`, `@shaper/logger`, `@shaper/auth`, `@shaper/queue` |
| **P2 — Agentic** | Beats, bridges, operator cockpit (KovZu) | `@shaper/maestro`, `@shaper/mail-agent`, bridges, `brick-helm` |
| **P3 — Business tools** | Persistent client/vertical apps **outside** P1+P2 | `market-intelligence`, `enterprise-chat`, `univ-sinistre`, CRM POC |

**Rule 0F**: KovZu / Helm is **P2 only**. Client ERPs, portals, and scrapers are **P3** — separate containers, ports, and lifecycles.

---

## 🗂️ 2. Repository Layout (actual tree)

```
REMOTE2/
├── SHAPER-OS/                    # Canonical generic law + packages + bricks
│   ├── packages/                 # @shaper/* (testable ESM)
│   ├── bricks/                   # Podman images (INTENT + Containerfile)
│   ├── universes/_template/      # Universe scaffold
│   ├── topology.json             # P1+P2 dependency graph
│   ├── RULES.md                  # Engineering invariants
│   ├── docs/
│   │   ├── PERIMETERS.md         # ← P1 / P2 / P3 law (read first)
│   │   ├── DOC-INDEX.md          # Documentation index & read order
│   │   ├── FUNCTIONAL-INVENTORY.md
│   │   ├── GOVERNANCE-FRACTAL.md
│   │   ├── UNIVERSE-ARCHITECTURE.md
│   │   ├── TOPOLOGY-INTENT.md
│   │   ├── EXPERIMENTS.md
│   │   └── SPEC_ZEPHIR_TALK.md   # OBSOLETE — /talk retired
│   └── scripts/                  # Factory, PRA, brick builds
│
├── UNIV7/                        # P1+P2 test sandbox (Artisan BTP watchdog)
├── UNIV8/                        # P1+P2 Podman stack + Helm + OpenCode
└── UNIV9/                        # P1+P2 Helm all-in-one + MariaDB embedded
```

**P3 verticals** (`univ-sinistre`, `univ-artisan`, `univ-immo`, …) are scaffolded via `univ-factory.mjs` — not yet present as deployable apps in this workspace.

---

## 🏗️ 3. Packages & Bricks Today

### P1 — Socle (implemented)

| Package | Brick |
| :--- | :--- |
| `@shaper/vault` | `brick-vault` |
| `@shaper/logger` | `brick-logger` |
| `@shaper/auth` | `brick-auth` |
| `@shaper/db` | `brick-mariadb` |
| `@shaper/queue` | `brick-queue` |

### P2 — Agentic (implemented)

| Package | Brick |
| :--- | :--- |
| `@shaper/maestro` | `brick-maestro` |
| `@shaper/agent` | `brick-agent` |
| `@shaper/mail-agent` | (library — instances via Maestro tasks) |
| `@shaper/bridge-agy` | `brick-bridge-agy` |
| `@shaper/bridge-opencode` | `brick-bridge-opencode` |
| `@shaper/ged-engine` | `brick-ged` |
| `@shaper/rag` | `brick-qdrant` (optional) |
| — | `brick-helm` (KovZu cockpit, no NPM scope) |

### P3 — Business (planned, not in repo)

| Name | Purpose |
| :--- | :--- |
| `market-intelligence` | Stealth scraper, market benchmark |
| `enterprise-chat` | Scoped SSE/WebSocket chat for **client apps** (not KovZu) |
| `ocr-engine` | PDF OCR for quotes/invoices |
| `wikiuniv-v1` | Showcase + RBAC portal |
| `univ-*` verticals | Sinistre, artisan, immo, CRM… via factory |

---

## 🏭 4. Universe Factory

Scaffold a **P3** vertical (or a new P1+P2 test universe):

```bash
node scripts/univ-factory.mjs create \
  --slug "immo" \
  --name "Real Estate & Rental Management ERP" \
  --port 3103 \
  --plugins "crm,ged,devis-facturation,webmail,chat"
```

Deploy a **P3 business brick** (never inside KovZu):

```bash
bash scripts/shaper-sandbox.sh
node scripts/shaper-tool-scaffold.mjs my-crm --port 8700 --title "Client CRM"
```

---

## 🚀 5. Quickstart & Verification

```bash
cd SHAPER-OS

# Bootstrap vault secrets (once)
npm run vault:bootstrap

# Unit + universe integration tests
npm test

# PRA socle rebuild (univ7)
npm run test:socle

# Live stack (from sibling universe)
cd ../UNIV8 && npm test && bash deploy/podman-up.sh

# Note: `npm run bootstrap` references a planned script not yet in repo — use vault:bootstrap + univ deploy scripts
```

---

## 🌐 6. Language & Collaboration Contract

* **All code, docstrings, commits, technical specs**: **English**.
* **Pair-programming & strategic discussions**: **French**.
