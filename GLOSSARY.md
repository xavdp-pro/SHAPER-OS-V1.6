# Glossary

| Term | Meaning |
| :--- | :--- |
| **Shaper OS** | Software on your Linux host: agent + secrets + logs + jobs. |
| **This kit** | Intent, templates, and reference law for install + keep. |
| **Universe** | One named install. Config and data. Not a copy of the OS. |
| **Brick** | One containerized service, reused at every scale. |
| **Fractal** | Same rules at brick, universe, host, and fleet. Specialize; do not fork. |
| **Perimeter** | A fence: what a piece may know and must never do. There are three (foundation, agent layer, business apps). Not the same as DEV/TEST/PROD. |
| **P1 / P2 / P3** | Short labels for those three perimeters (*P* = perimeter). |
| **INTENT.md** | What / why + 4–6 rules that must not be broken. |
| **manifest.json** | Which bricks this universe uses and in what boot order. |
| **AGENT-DEPLOY.md** | What the **install** agent may do. |
| **AGENT-CONTEXT.md** | Rules for the **runtime** agent. Not used at install time. |
| **Vault / logger / queue / Maestro / bridge** | Secrets, audit, jobs, scheduler, AI CLI HTTP front. |
| **Helm / `/console`** | Optional operator web UI. |
| **DEV / TEST / PROD** | Explore / rebuild-from-zero-then-destroy / tagged live system. |
| **PRA** | Proof you can restore from scratch (the TEST cycle). |
| **Specialize** | Point at a generic brick and pass files/env — never copy its image recipe. |
