# Package: @shaper/bridge-opencode

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)

## 1. Declarative Objective

HTTP/SSE bridge piloting OpenCode CLI — free-tier default (`opencode/deepseek-v4-flash-free`).

## 2. Invariants

1. Endpoints: `/api/health`, `/api/inject`, `/api/events`, `/api/metrics`.
2. Default model: `opencode/deepseek-v4-flash-free` ($0.00) — never hardcode paid keys.
3. Spawn env must not inject Gemini/Antigravity keys into opencode.
4. Localhost or mesh bind only.
5. Native `node --test` suite validates contract before deploy.
