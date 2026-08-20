# Intent: @shaper/brick-helm (Helm v2 Web Chat Interface)

## Role
Containerized modern Web Chat & Console interface (React 19 + Express 5) allowing operators and users to interact in real time with sovereign AI agents (OpenCode / AGY) via WebSocket / SSE and Deepgram Voice STT/TTS.

## Invariants
1. **Bridge contract**: Helm v2 dispatches chat prompts to `CLI_BRIDGE_URL` (default: `http://127.0.0.1:4440/api/inject`) and receives streaming tokens via SSE (`/api/events`).
2. **Voice STT/TTS**: Deepgram WebSocket proxy configured with `DEEPGRAM_API_KEY` for live speech-to-text transcription.
3. **Public Exposure**: Edge routing via Cloudflare Tunnel (`cloudflared`) to `ia.szde.fr` on port `8650`.
4. **Resilience**: Operates gracefully with standalone/demo mode even if an external SQL cluster is offline.
