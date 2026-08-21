# brick-bridge-opencode

> GENERIC INTENT — Real `opencode-bridge` + OpenCode CLI **inside** the image.

## Invariants

1. Binary `/usr/local/bin/opencode` is baked into the image (not host bind-mount).
2. Runtime uses vendored `packages/opencode-bridge` (`opencode serve` + HTTP/SSE contract).
3. Port 4340 (bridge) / 4341 (internal serve).
4. Default free model: `opencode/nemotron-3.5-lightning-free`.
5. Auth: Bearer token at `TOKEN_FILE` (shared with maestro/queue).
6. Model Discovery: At deployment time, available free models (`opencode models`) must be checked and active free models prioritized. Groq models are isolated from general chat.
