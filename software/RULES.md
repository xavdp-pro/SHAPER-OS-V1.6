# SHAPER OS & UNIV — Fundamental Engineering Rules & Architecture Invariants

---

### Rule 0: Language & Collaboration Protocol
* **English for All Technical Assets**: 100% of source code, variable/function names, API schemas, JSON payloads, Git commit messages, branch names, technical specifications, and repository documentation (`README.md`, `RULES.md`, `AGENT-CONTEXT.md`) MUST be written strictly in **English**.
* **French for Human-Agent Pair Programming**: All strategic discussions, planning sessions, architectural reflections, live brainstormings, and human interactions are conducted fluently in **French**.

---

### Rule 0A: Three Perimeters Taxonomy (P1 / P2 / P3)

Every component, package, brick, or app MUST be classified into **exactly one** perimeter before design or deploy. Canonical source: [`docs/PERIMETERS.md`](./docs/PERIMETERS.md).

| Perimeter | Objective | Examples |
| :--- | :--- | :--- |
| **P1 — Minimal socle** | Secrets, audit, auth, generic jobs, boot — zero business logic, zero mandatory LLM | `@shaper/vault`, `@shaper/logger`, `@shaper/auth`, `@shaper/queue`, `@shaper/db` |
| **P2 — Agentic** | Deterministic beats, bridges, operator cockpit (KovZu organism) | `@shaper/maestro`, `@shaper/mail-agent`, bridges, `brick-helm`, `@shaper/ged-engine`, `@shaper/rag` |
| **P3 — Business / client tools** | Persistent vertical apps **outside** P1+P2 — separate port, volume, lifecycle | `market-intelligence`, `enterprise-chat`, `univ-sinistre`, CRM POC |

* **Rule 0F alignment**: KovZu / Helm is **P2 only**. Client ERPs, scrapers, and scoped client chat are **P3** — never merged into the cockpit.
* **Test universes** (`UNIV7`, `UNIV8`, `UNIV9`) prove **P1+P2** — they are not P3 verticals.
* **Removed UI**: `/talk` and `/voice` redirect to `/console`. Operator voice STT/TTS inside `/console` remains **P2**.

---

### Rule 0B: Universal Parametric Genericity Invariant (Zero Hardcoding)
* **Everything Behaves as a Parameterized Function**: Every script, engine, deployment workflow, container blueprint, and documentation guide MUST be engineered as a pure, parametric abstraction that receives its parameters via CLI arguments, environment variables, or configuration manifests.
* **Multi-Infrastructure Portability**: All components must run interchangeably on Proxmox VE, LXD, raw KVM, standalone bare-metal Debian, or cloud VPS instances (Hetzner, OVH, Scaleway, AWS, home-lab) without modifying source code.
* **Zero Hardcoded Environment Residue**: Never hardcode specific IP addresses, hypervisor node names, private subnets, tenant domains, or static credentials into code, scripts, or specifications.
* **Mandatory Intent Header Classification (Generic vs Specific)**: Every `INTENT.md` or blueprint document in SHAPER OS MUST declare its exact classification at the very top header:
  * `> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)` for reusable abstract bricks in `SHAPER-OS/`.
  * `> **Intent Classification**: SPECIFIC INTENT (Universe: <univ_slug>)` for concrete instantiated deployments in experimental sandboxes or apps.
* **Strict Distinction: Abstract Specs vs Concrete Examples**: Technical documentation must always define abstract parameterized interfaces first (e.g. `<CLIENT_MESH_IP>`, `<GATEWAY_HOST>`, `<DOMAIN_NAME>`).
* **Explicit Demarcation of Specialized Examples**: Following any generic documentation, specialized real-world implementation examples (e.g. a specific Proxmox hypervisor, cloud node, or demonstrator) MAY be provided, but MUST ALWAYS be explicitly labeled under a dedicated section header: `### Illustrative Example (Non-Binding / Demonstration Only)`. There must be zero ambiguity between universal contracts and specific illustrative cases.

---

### Rule 0C: Declarative Agent-First Simplicity (High-Signal Intent)
* **Mandatory Declarative Standard**: All future system blueprints, container specifications, agent tasks, and workflow documentations in SHAPER OS MUST ALWAYS follow the **Pure Declarative Intent Format** (4-6 high-signal bullet points defining Invariants, Environment, Runtime, and Security) rather than verbose imperative code blocks.
* **Intent Over Boilerplate**: With modern autonomous AI agents, documentation must state the high-level intent, core invariants, and mandatory constraints clearly in plain language rather than drowning the reader in hundreds of lines of rigid low-level boilerplate.
* **The Justified Golden Snippet Exception**: While verbose boilerplate is forbidden, **including critical minimal code snippets or exact declarations is strictly permitted and encouraged when justified** (e.g. when days of research yielded a vital 2-line solution for LXC capabilities, WireGuard flags, or subtle configs). Alternatively, store companion code in dedicated `examples/` folders.
* **Dynamic Runtime Adaptability ("Dynamic in the Interpreted Sense")**: Architecture rules are protective guardrails, not rigid handcuffs. Systems and agents must adapt fluidly to runtime context (evaluating parameters dynamically like an interpreted engine) rather than hitting static compile-time walls.
* **Human as the Dynamic Compass**: The human operator provides live strategic direction and intent. The AI agent must maintain a matching dynamic mindset: adapting its execution path and tooling pragmatically to the human's guidance.
* **Minimalist Documentation Rule**: Keep documents lean, readable, high-signal, and focused strictly on the *What*, the *Why*, and the *Contract Invariants*. Less noise equals zero token waste, zero hallucinations, and maximum agility.

---

### Rule 0D: Dual Intent & Topology Manifest Protocol (INTENT.md + JSON)

SHAPER OS uses **two complementary layers** — never one replacing the other:

| Layer | File | Audience | Purpose |
| :--- | :--- | :--- | :--- |
| **Declarative Intent** | `INTENT.md` | Humans & AI agents | Philosophy, invariants, security boundaries, parameterized contract |
| **Topology Manifest** | `topology.json` (repo root) or local `deps.json` | Scripts, CI, agents, Quadlet tooling | Machine-readable dependency graph, boot order, ports, `requires` / `provides` |

* **INTENT.md is mandatory** for every `@shaper/*` package and every `brick-*` directory. It answers *What* and *Why*.
* **JSON manifests are mandatory at ecosystem level** via the canonical root file [`topology.json`](./topology.json). It answers *Who depends on Whom* and *In what order*.
* **Optional local `deps.json`** MAY exist inside a `packages/<name>/` or `bricks/brick-<name>/` directory when a component needs to declare overrides for a specific universe — but the root `topology.json` remains the master graph.
* **Zero duplication of philosophy in JSON**: JSON files MUST NOT repeat INTENT prose. They carry only structured fields: `id`, `type`, `requires`, `optional`, `provides`, `port`, `bootAfter`.
* **Agent-Synthesized Defaults**: Business rules and deploy details are **not** stored in `topology.json` unless a human explicitly requests an override. Silence = agent decides freely, as long as each brick `INTENT.md` invariants are respected.
* **Override Protocol**: When a human states a specific constraint (port, path, schema, dependency), add it to `topology.json` or a local `deps.json`. Never preemptively.
* **Validation**: Any `doctor`, bootstrap, or deploy script MUST read `topology.json` for ordering — never hardcode dependency chains in shell scripts. The validator CLI `scripts/shaper-deps.mjs` is **planned** (see [`docs/TOPOLOGY-INTENT.md`](./docs/TOPOLOGY-INTENT.md)); until it ships, validate manually against `topology.json` and package `imports`.

---

### Rule 0E: Materialization Pipeline (INTENT → Podman → Proof → Registry)

**Primary deployable unit**: `brick-<name>/` (INTENT + Podman image). A `packages/@shaper/*` NPM brick is **optional** — extract code only when it stabilizes or needs fast unit tests.

| Step | Who | What |
| :--- | :--- | :--- |
| 1. **INTENT** | Human | Declares objective + invariants (the law) |
| 2. **Materialize** | Agent | Builds Podman image + entrypoint (vibe-code). Silence = agent decides all unspecified details |
| 3. **Test** | Agent + Human | Unit (`node --test`) → contract (Podman alone) → integration (Podman + stack peers). Must pass before registry |
| 4. **Registry** | Human validates | Tag immutable image (`v1.x.y`), push to mesh registry. Prod never pulls floating `latest` |
| 5. **Deploy** | Quadlet | Pulls tagged image, boots per `topology.json` graph |

* **Trust model**: INTENT = law. Agent = creativity within the law. Tests = proof. Registry tag = frozen artifact you trust — not the agent's last run.
* **Package extraction**: `packages/` is a **stabilization artifact**, not a prerequisite to deploy. Start with INTENT + Podman; extract `@shaper/*` when reuse or test speed warrants it.
* **Machine-readable steps**: See `materializationPipeline` in [`topology.json`](./topology.json) for CI/doctor scripts.

---

### Rule 0F: Strict Distinction Between Operator Cockpit (KovZu / SHAPER-OS) and Client-Facing Tools

* **KovZu is the Operator & Sovereign Cockpit Only**:
  * The KovZu / Helm-v2 web console is strictly the **internal operating system cockpit** for the human administrator/operator, supervisor, and autonomous AI agents (OpenCode, Maestro, Zephir).
  * KovZu provides agent control, timelines, live audio orchestration, system logs, vault secrets, database engines, and universe administration.
* **Client Tools are Strictly Distinct Applications**:
  * Any client-facing software, vertical business portals, customer dashboards, mini-apps, external deliverable widgets, or end-user interfaces (e.g. `univ-sinistre`, `univ-immo`, customer tracking UI) MUST BE built, deployed, and served as **standalone, distinct applications/containers**.
  * Client tools MUST NEVER pollute, overload, or be merged into the KovZu operator console.
  * KovZu acts as the engine, API provider, and intelligence orchestrator behind the scenes, while client tools consume standard REST/SSE/WebSocket endpoints with their own distinct UX, authentication boundaries, and client branding.

---

### Rule 0G: Strict "NO FAKE, NO FALLBACK" Testing & Validation Invariant

* **Zero Simulation / Zero Mock in Integration Tests**:
  * Tests MUST NEVER simulate, fake, mock, or emulate real operations when validating system capabilities, container runtimes, APIs, or AI agent autonomy.
  * No mock servers, no synthetic HTTP stubs for core services, no dummy return values masquerading as real execution.
* **Real Environment Execution Only**:
  * Every test MUST hit the **real running services** (the real Vault AES encryption, the real Logger JSONL file on disk, the real Queue memory/redis, the real GED filesystem, the real Qdrant vector engine, the real Podman runtime).
  * If a command is tested (e.g. `podman run --rm alpine uname -a`), it MUST actually spin up the real container and return real kernel output.
* **Zero Silent Fallback / Fail Hard**:
  * Tests and test runners MUST NEVER silently swallow errors, fall back to simulated success, or catch exceptions just to output a green checkmark.
  * If a service or command fails, the test MUST fail hard, emit the exact raw error, and force a real architectural resolution.
* **Agent Self-Validation Contract**:
  * When the AI agent proves it can execute a task (e.g. configuring a mailbox in the Vault, querying the cluster, analyzing a document in `/data/ged/`), it must execute the real shell/API commands and verify the real state on disk / in memory. Fake results, invented numbers, or simulated completions are strictly forbidden.

---

### Rule 0H: Universal Interchangeable CLI Matrix & Human-Arbitrated Economics

* **All AI Agent CLIs Are Interchangeable Commodities**:
  * SHAPER OS is strictly agnostic to the underlying AI agent CLI (`opencode`, `cursor-cli`, `claude-code`, `codex`, `openrouter`, `ollama`).
  * The system decouples the intelligence engine from the orchestration fabric via standard Bridge interfaces (`/api/conversations/*`, SSE streams). Swapping an engine requires zero structural or architectural changes.
* **Human-Governed Economic & Mission Arbitration**:
  * The choice of CLI engine belongs strictly to the **human operator**, dynamically adjusted according to budget, privacy, and task complexity:
    * **Tier 0 (Free / Sovereign / Default Bootstrap)**: `OpenCode` with free models (`deepseek-v4-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3-ultra-free`). Ideal for everyday system administration, tests, Podman orchestration, and routine operations at zero cost.
    * **Tier 1 (Air-Gapped / 100% On-Premise Sovereign)**: `Ollama` / `vLLM` (Llama 3.3, Mistral, Qwen) for complete data isolation without external cloud dependencies.
    * **Tier 2 (Balanced Pro / Fast Feature Building)**: `Cursor CLI` with `Composer` / `Grok 4.6` / `Claude 3.5 Sonnet` for professional coding and fast iterations.
    * **Tier 3 (Elite Heavy Artillery / Deep Refactoring)**: `Claude Code` with `Claude 3.5 Opus` / `Sonnet` for massive multi-file architectural refactors and high-stakes reasoning.
    * **Tier 4 (Multi-Provider Aggregators)**: `OpenRouter` for dynamic routing across diverse model providers.
* **Bridge Compatibility Invariant**:
  * Every CLI runtime connects to the universal KovZu / Helm cockpit and receives identical context digests (`_kovzu/CONTEXT.md`, `topology.json`, persistent memory).

---

### Rule 0I: Pure IA-Driven Installation Doctrine (Zero Installer Monoliths / Pure Intent Synthesis)

* **Zero Rigid Installation Programs ("No Hardcoded Installers")**:
  * SHAPER OS strictly forbids writing monolithic, rigid installation programs, closed binaries, or brittle procedural shell wizards that assume fixed paths, hypervisor quirks, or rigid hardware layouts.
* **Everything Starts from Declarative INTENT**:
  * The human or architect declares the **INTENT** (`INTENT.md`, `topology.json`, security boundaries, required invariants).
* **The AI Agent Directly Fabricates and Shapes the Socle**:
  * Installation is a 100% **IA-Driven Process**: the autonomous AI agent (Antigravity at meta-level, or OpenCode / Zephir in-container) reads the declarative intent, probes the physical host and runtime limits (`cgroups`, RAM, disk, kernel version, existing packages), and **synthesizes, provisions, and configures the environment on the fly**.
* **Dynamic Synthesis Over Fragile Scripts**:
  * If a dependency is missing, the AI agent resolves and installs the exact right package for that specific OS runtime (`apt`, `apk`, `pip`, `npm`).
  * If an environment configuration or port needs adjustment, the AI agent adapts dynamically without failing compile-time checks.
  * **Summary**: The human sets the *What* and the *Why* (Intent); the AI agent dynamically constructs and validates the *How* (Materialization).

---

### Rule 0J: The Human Vibe-Coder & AI Agent Contract — Strict `.env` Verification, Key Propagation, and the Standard vs Freestyle Guarantee

* **Human Vibe-Coder & AI Agent Partnership**:
  * The human vibe-coder is the visionary project owner and sovereign director.
  * The AI agent is the meticulous technical co-pilot and strict executor.
* **Strict `.env` Pre-Flight Verification & Mandatory Halt**:
  * **Pre-Flight Inspection**: Before building images, launching containers (`podman-up.sh`), or running tests, the AI agent **MUST ALWAYS inspect the `.env`** (at repository root, `software/.env`, or universe directory).
  * **Zero Blind Execution**: The AI agent MUST NEVER start deployment blindly hoping secrets exist or using dummy placeholders that return 401s.
  * **Proactive Key Reclamation**: If any required secret (`VAULT_MASTER_KEY`, `JWT_SECRET`, `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, Cloudflare tunnel token) is missing or empty, the AI agent **MUST HALT IMMEDIATELY**, explain which key is missing, provide the exact vendor signup/console URL, and wait for the human to paste it.
* **Multi-Podman Key Propagation**:
  * The AI agent is strictly responsible for copying and propagating the validated `.env` across all universe and Podman runtime directories (`software/.env`, `deploy/env`, `deploy/univ9.env`).
* **The "Standard vs Freestyle" Guarantee & Responsibility Matrix**:
  * **Standard Recipe ("La Sauce Robuste")**: When the human respects the checklist and provides a complete, valid `.env`, the entire Shaper OS deployment pipeline is guaranteed to be **100% deterministic, predictable, autonomous, and green from end to end**.
  * **Freestyle Mode ("Liberté Totale")**: The human user is 100% free to go freestyle, test with partial keys, run experimental stacks, or customize rules. However, managing degraded/inactive services in freestyle mode is the **user's full responsibility with their AI agent**. The core baseline cannot be considered failing if the standard formula was bypassed.

---

### Rule 0K: Inter-Container Token Synchronization, Anti-Silence Guarantee & Reborn Presentation Invariant

* **Deterministic Inter-Container Token Sync**:
  * **Priority to `.env`**: Whenever `podman-up.sh` runs, `OPENCODE_BRIDGE_TOKEN` or `CLI_BRIDGE_TOKEN` from `.env` MUST strictly overwrite any stale token on disk (`/root/.config/opencode-bridge/token`).
  * **Shared Auth Contract**: Helm, Bridge, Queue, and Maestro MUST strictly share the identical authentication token to eliminate `HTTP 502 Unauthorized` errors on control actions (`/reset`, `/clear`, `/stop`, `/inject`).
* **Anti-Silence & Guaranteed Final Response**:
  * **Zero Orphaned Runs**: In any bridge adapter (`opencode-bridge`, etc.), the `session.idle` event MUST NEVER emit an empty text payload.
  * **Error Surfacing**: If a tool or model aborts (`MessageAbortedError`, bash timeout, etc.), the error MUST be surfaced explicitly as the assistant's final text (`⚠️ Erreur outil...`).
  * **Fallback Conclusion**: If a session concludes without a text part, a default completion summary is automatically emitted so the UI bubble and Deepgram voice engine are never starved or hung.
* **Reborn (Session Prime) Invariant**:
  * **Clean Rebirth**: Triggering Reborn (via UI button or voice keyword « reborn ») MUST wipe previous conversation turns on the bridge, flush the local timeline, and immediately re-inject the official Presentation Briefing (*"Bonjour [Nom] ! Je suis Zephir..."*).
  * **UI Timeline Retention**: The UI MUST preserve the freshly returned Prime run without blanking out.
* **Mandatory Closed-Loop Test Validation**:
  * Any agent modifying the bridge, Helm, or voice pipeline MUST execute and confirm 100% success on:
    1. `software/scripts/test-voice-player.mjs` (Acoustic dB verification + 401 strict rejection test).
    2. `software/scripts/test-e2e-business-flow.mjs` (Full 6-step autonomous business flow).

---

### Rule 1: Canonical Naming Conventions & Mandatory `univ-` Git Prefix

* **Mandatory `univ-` Git Repository Prefix (Everywhere)**: All Git repositories across the entire ecosystem MUST STRICTLY begin with the prefix `univ-`. No exceptions are permitted.
  * Master Core Framework: `univ-shaper-os` (or `univ-shaper`)
  * Business Universes: `univ-immo`, `univ-sinistre`, `univ-artisan`, `univ-ciel`, `univ8`
  * Standalone Engines / Tools: `univ-vault`, `univ-app-shell`, `univ-mail-agent`

The `univ-` prefix provides a unified sovereign brand across Git, container namespaces, and system services while internally distinguishing deployable applications from composable logic packages.

| Element Type | Scope / Layer | Canonical Naming Convention | Real-World Examples |
| :--- | :--- | :--- | :--- |
| Composable Logic Bricks | NPM Scope `@shaper/` | `@shaper/<brick>` | `@shaper/vault`, `@shaper/logger`, `@shaper/queue` (**P1**); `@shaper/maestro`, `@shaper/mail-agent`, bridges (**P2**); `@shaper/waf`, `@shaper/variables`, `@shaper/ai-client` (**planned** — see [`docs/PERIMETERS.md`](./docs/PERIMETERS.md)) |
| Vertical Universes (Apps) | Apps / Containers | `univ-<vertical>` | `univ-sinistre` (Legal & Insurance), `univ-artisan` (Construction/BTP), `univ-crm`, `univ-webmail`, `univ-wiki`, `univ8` |
| AI Agent Bridges | Apps / Containers | `univ-bridge-<agent>` | `univ-bridge-agy`, `univ-bridge-opencode`, `univ-bridge-claude` |
| Master Repository | Git Organization | `univ-shaper-os` | `xavdp-pro/univ-shaper-os` (Master Git) |

* **Brick Isolation Invariant**: A `@shaper/*` package never has knowledge of the universe consuming it (zero coupling, 100% isolated unit test coverage).
* **Universe Lifecycle Invariant**: Every deployable container/app conforms to the triumvirate lifecycle (`univ-<slug>-dev`, `univ-<slug>-test`, `univ-<slug>-prod`).

---

### Rule 2: Atomic Git Commits per Package & Feature
* Every time a LEGO brick, component, or package is updated and certified, execute an atomic commit immediately:
  ```bash
  git add <path> && git commit -m "feat(<scope>): descriptive commit message"
  ```
* Maintain a clean, linear, and verifiable commit history on `origin/master`.

---

### Rule 3: Proactive Podman Images & Quadlets Management
* Whenever software or configuration changes impact a container:
  1. Rebuild the corresponding Podman image.
  2. Push / tag the image to the local mesh registry (`10.87.78.3:5000` or local repo).
  3. Reload Quadlets via Systemd: `systemctl daemon-reload && systemctl restart <service>`.

---

### Rule 4: Standard Turbinobash Layout & On-Demand Database Isolation
* **Plesk-like CLI Hosting Heritage**: SHAPER OS inherits the battle-tested, sovereign hosting philosophy of **Turbinobash (`tb`)**—a lightweight, CLI-first alternative to bloated control panels (like Plesk or cPanel) providing zero-friction app deployment, reverse-proxying, user isolation, and automated database provisioning.
* **Official Turbinobash Documentation & Repositories**:
  * Core Hosting Engine: [https://github.com/xavdp-pro/turbinobash-web](https://github.com/xavdp-pro/turbinobash-web)
  * LXC & Containers Module: [https://github.com/xavdp-pro/turbinobash-web-lx](https://github.com/xavdp-pro/turbinobash-web-lx)
* **Standard Turbinobash File Structure (`/apps/<slug>/`)**: Every deployed application or service brick adheres strictly to the canonical Turbinobash filesystem hierarchy:
  ```
  /apps/<slug>/
  ├── app/                                 # Application source code / entrypoint
  ├── etc/mysql/localhost/passwd           # Isolated MariaDB password file (auto-generated)
  ├── log/activity.jsonl                   # Append-only structured JSONL audit stream
  └── sav/                                 # Local atomic state dumps & snapshots
  ```
* **On-Demand Isolated Database Convention (`user = database = slug`)**:
  * **On-Demand Only**: A container or service instantiates a MariaDB database **strictly if and only if it requires relational state storage**.
  * **Strict Isolation Invariant**: Whenever a database is required, it must follow `user = database = <slug>`. No shared default credentials.
  * **Password Resolution Order**:
    1. Primary source of truth: read directly from `/apps/<slug>/etc/mysql/localhost/passwd`.
    2. Fallback (Dev / CI testing): read from `process.env.MYSQL_PASSWORD`.
* **Continuous Architectural Traceability**: Document every architectural choice with *What* (concise description) and *Why* (business rationale).

---

### Rule 5: 100% Native Unit & Contract Tests (node --test)
* 100% test pass rate required prior to any staging or production deployment.
* Zero external bloated testing frameworks; use the native Node.js test runner (`node --test test/*.test.js`).
* Cold-boot execution time under 2000ms.

---

### Rule 6: Targeted Agent Bootstrapping (Token Optimization & Zero Idle Waste)
* Every AI agent is bootstrapped with an isolated, targeted context file (`AGENT-CONTEXT.md`).
* Never re-inject entire system rulebooks into execution prompts; send only the short delta/instruction.
* Leverage prompt caching, local deterministic idempotence checkpoints (`checkpoint.json`), and zero token consumption when idle.

---

### Rule 7: Official LLM Models & Execution Defaults
* **Antigravity CLI & Agent Bridge (`univ-bridge-agy`)**: `gemini-3.7-flash-low` (default production setting).
  * Flags: `effort: low`, `dangerouslySkipPermissions: true`, `outputFormat: stream-json`.
* **OpenCode Agent (`univ-bridge-opencode`)**: `opencode/deepseek-v4-flash-free` ($0.00 / 100% free) or local sovereign Ollama (`qwen2.5-coder:7b`).

---

### Rule 8: Universal Agent Container Contract
Every containerized AI agent must satisfy four core HTTP endpoints:
1. `GET /api/health` — Service readiness & DB connection.
2. `POST /api/inject` — Dynamic context ingestion (`AGENT-CONTEXT.md`).
3. `GET /api/events` — Real-time Server-Sent Events (SSE) stream.
4. `GET /api/metrics` — JSONL structured event logging & latency tracking.

---

### Rule 9: Strict Mailbox Isolation (Test/Dev vs Prod)
* All IMAP synchronization, categorization, and message testing must strictly target dedicated test mailboxes.
* Absolute protection against data corruption or unintended message operations in production.
* Centralized AES-256 encrypted credential storage in `vault-engine`.

---

### Rule 10: The Universe Triumvirat & Cold-Boot PRA (< 120s)
Every business universe `<slug>` operates across three strictly decoupled lifecycle stages:
1. `univ-<slug>-dev`: Fast prototyping and vibe-coding on the `dev` branch.
2. `univ-<slug>-test` (or `univ-test1`, `univ-test2`, `univ-testX` in parallel):
   - **The real PRA test is strictly FROM SCRATCH**: blank LXC container, WireGuard split-mesh attachment, Podman stack boot, Vault injection, and 100% test execution.
   - **Mandatory Destroy-After-Test Rule**: Once the test cycle is verified, the ephemeral test container **MUST BE DESTROYED** (`pct destroy <vmid>` or `lxc delete --force`) to guarantee zero residue and prove continuous cold recovery.
3. `univ-<slug>-prod`: Initialized once, then atomic hot-updated via Git release tags (`v1.x.y`) and Quadlet reloads without service disruption.

---

### Rule 11: Standard LXC Deployment & Nested Podman
* For deploying on Linux VPS hosts (e.g. Debian 13 with LXD/LXC):
  * **LXD Profile `podman-univ` mandatory**: nesting enabled, privileged mode, kernel modules `overlay,nf_nat,ip_tables,fuse,tun`.
  * **Host Kernel Modules**: loaded via `/etc/modules-load.d/lxc-podman.conf`.
  * **First Boot Requirement**: `apt-get update && apt-get dist-upgrade -y && apt-get clean`, followed by injecting `SKEL/etc/{bash.bashrc,inputrc}`.

---

### Rule 12: Secure Archive Distribution & Cold Recovery
* All archive transfers (`PROJECT.tar.bz2`, `REMOTE.tar.bz2`) must follow:
  * Multi-threaded compression (`pbzip2` or `tar -cjf`).
  * Zero directory listing (`autoindex off`).
  * Mandatory HTTP Basic Auth (`auth_basic` with hashed credentials).
  * End-to-end TLS encryption via Cloudflare Tunnel.

---

### Rule 13: Hybrid WireGuard Private Mesh Network & Mandatory Peer Naming
* All distributed nodes (`univ7`, cloud VPS, bare-metal Proxmox) join the private encrypted mesh:
  * Central gateway on subnet `10.87.78.0/24` (or configured mesh subnet).
  * Dynamic peer key registration.
  * Persistent keepalive (`PersistentKeepalive = 25`) for firewall/NAT traversal.
* **Mandatory Human-Readable Peer Comments**: Because raw WireGuard only uses cryptographic hashes, every AI agent or engineer registering a peer on the gateway (`wg0.conf`) MUST ALWAYS precede the `[Peer]` block with an explicit comment tag:
  ```ini
  ### Client <hostname> (CT <vmid> on <host>)
  [Peer]
  PublicKey = <CLIENT_PUBLIC_KEY>
  AllowedIPs = <CLIENT_MESH_IP>/32
  ```
  Anonymous or untagged peer blocks are strictly prohibited to ensure instant auditability and DNS mapping.

---

### Rule 14: Efficient Podman Vision Containers (vision-neko)
* **Priority to Blind Mode (0 LLM Tokens / 5ms)**: Use deterministic X11 commands (`neko-desk control <deskId> launch|paste|key|exec`) for standard application launching and document conversions.
* **Multimodal Visual Mode via MCP (`neko-desk`)**: Use screenshots and cursor actions only when interacting with legacy graphical interfaces lacking programmatic APIs.

---

### Rule 15: Media Art Direction & Industrial Realism
* Natural warm sunlight, healthy green vegetation, genuine professional expressions, and dual representation of human operators and sustainable infrastructure.

---

### Rule 16: Quadri-Tier Backup Strategy (Containers, DB, Git, Glacier S3/R2)
Every production architecture enforces four decoupled backup layers:
1. **Tier 1 — Containers & File Systems**: Automated snapshots of LXC containers and mounted `/apps/<slug>/sav/` volumes.
2. **Tier 2 — Databases & State**: Deterministic MariaDB dumps (`mysqldump`), Qdrant vector snapshots, and JSONL audit trails.
3. **Tier 3 — Code & Architectural Logic (Git)**: Immutable versioned repository on `xavdp-pro/shaper-os` with signed release tags.
4. **Tier 4 — Cold Cloud Storage (Glacier S3 / Cloudflare R2)**: Off-site encrypted archives (AES-256-GCM) with WORM immutability policies.

---

### Rule 17: Mandatory TTS Phonetic Dictionary, Acronym Expansion & Fine Word Karaoke
* **Universal TTS Text Normalization (`ttsFormat.js`)**: When text is dispatched to the AI TTS synthesizer (Deepgram Aura, Cartesia, ElevenLabs), all text MUST be formatted via `formatTextForTts(text, locale)`:
  * **Acronym Expansion**: Technical acronyms (`API`, `SQL`, `GED`, `URL`, `SSH`, `HTTP`, `HTTPS`, `CSV`, `PDF`, `TTS`, `STT`, `LLM`, `IA`, `UI`, `UX`, `OS`, `RAM`, `CPU`, `DB`, `IP`, `CLI`, `JSON`, `SDK`, `DNS`, etc.) are converted to hyphenated letters (`A-P-I`, `S-Q-L`, `G-E-D`, `C-S-V`, `J-S-O-N`) to force clean, natural letter-by-letter pronunciation instead of garbled phonetics.
  * **Markdown & Artifact Stripping for Voice**: Code blocks (`` ``` ``), inline backticks, image links (`![...]`), raw markdown URLs, and emotion tags (`[calm]`, `[excited]`) are cleanly stripped from the spoken audio pipeline while preserving full rich markdown in the written chat bubble.
  * **Locale Symbol Expansion**: Symbols like `%`, `&`, `@`, `+` are expanded into their natural locale equivalents (`pour cent`, `et`, `arobase`).
* **Strict Fine-Grained Word-by-Word Karaoke Invariant**:
  * **Zero Giant Block Highlighting**: Surlignage by entire sentences/paragraphs (`grain: 'sentence'`) is strictly forbidden. The player and markdown viewer MUST always enforce fine word granularity (`grain: 'word'`).
  * **Clock-Synchronized Word Weighting**: For streaming providers without native word timestamps (e.g. Deepgram Aura), timings are computed via `estimateKaraokeWords` based on word length and punctuation weight, dynamically rescaled against actual PCM playback duration.
  * **Fluid Visual Reading**: In `MarkdownContent.jsx` and `InlineKaraokeText.jsx`, only the exact word currently being spoken (`activeIndex`) is illuminated in real-time, providing a smooth, realistic, and responsive reading experience.

---

### Rule 18: Primary Admin Account Onboarding Protocol (Zero Unsolicited Dummy Users)
* **Explicit Human Prompting Upon Setup Completion**: Whenever an AI agent or deployer completes the bootstrap and health checks of a new SHAPER OS / Helm universe:
  1. The agent MUST explicitly ask the human operator for their desired primary Admin credentials:
     * Preferred **Email address** (e.g. `xavier@xavdp.pro` or custom).
     * **First Name / Display Name** (e.g. `Xavier`).
     * Secure **Password**.
  2. The agent MUST NOT leave unverified, dummy, or hardcoded mock users in the system database.
  3. The agent provisions the account in MariaDB (`users` table) with `role: 'admin'`, seeds their dedicated workspace directory (`/data/opencode-ws/<User>`), generates the sovereign `CONTEXT.md`, and confirms the login URL to the human.
* **Zero Legacy Demo Clutter**: Demo guest accounts from older sandboxes (such as `ivonne`) are strictly prohibited in the default base source code, registries, and production instances.


