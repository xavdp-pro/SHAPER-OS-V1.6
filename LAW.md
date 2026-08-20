# The law does not bend

This kit exists to **execute** Shaper OS, not to dilute it.

If a step is law, it is **mandatory**. Convenience is not a reason to skip it.

| We are determined | We do not |
| :--- | :--- |
| Unit tests green on a **fresh clone** before images | Skip tests because “the stack will fail them anyway” |
| Live tests green **after** the stack is up | Run live tests before deploy, then ignore the red |
| No secrets in git | Ship default API keys “so it works on my machine” |
| First install is **DEV** | Call a laptop **PROD** |
| TEST is rebuilt from empty, then **destroyed** | Keep a dirty TEST |
| `/console` is perimeter 2 | Put the client shop in Helm |
| Bricks are referenced, not copied | Fork Containerfiles into the universe |
| Voice in `/console` | Revive `/talk` or `/voice` |

If a check fails: **stop**. Fix it. Do not stub your way to green.

Software long form: `software/RULES.md`, `software/docs/PERIMETERS.md`.
