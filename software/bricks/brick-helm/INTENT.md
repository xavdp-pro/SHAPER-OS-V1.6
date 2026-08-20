# Intent: @shaper/brick-helm (Helm v2 Web Chat Interface)

## Role
Containerized modern Web Chat & Console interface (React 19 + Express 5) allowing operators and users to interact in real time with sovereign AI agents (OpenCode / AGY) via WebSocket / SSE and Deepgram Voice STT/TTS.

## Invariants
1. **Bridge contract**: Helm v2 dispatches chat prompts to `CLI_BRIDGE_URL` (default: `http://127.0.0.1:4440/api/inject`) and receives streaming tokens via SSE (`/api/events`).
2. **Voice STT/TTS**: Deepgram WebSocket proxy configured with `DEEPGRAM_API_KEY` for live speech-to-text transcription and natural speech synthesis (`ttsFormat.js` with fine word-by-word karaoke).
3. **Primary Admin Account Onboarding Protocol**: Upon completing universe/stack bootstrap, the deploying agent MUST explicitly prompt the human operator for their desired primary Admin credentials (Email, First Name / Display Name, and Password). The agent creates this administrative account in MariaDB (`role: 'admin'`), links their personal workspace (`/data/opencode-ws/<User>`), and seeds the universal `CONTEXT.md`.
4. **Clean Sovereign Users (Zero Legacy Demo Accounts)**: Third-party demo accounts (e.g. `ivonne`, legacy demo guests) are strictly forbidden from default production/development databases and registries.
5. **Public Exposure**: Edge routing via Cloudflare Tunnel (`cloudflared`) on port `8650`.
6. **Resilience**: Operates with MariaDB auth, audit logging, and sovereign session persistence.
