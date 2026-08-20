# SHAPER-OS — Helm v2 Web Chat & Voice Integration

> **Perimeter**: Helm KovZu = **P2**. Operator voice (STT/TTS) lives **inside `/console`**.  
> Routes `/talk` and `/voice` **redirect to `/console`**. See [`PERIMETERS.md`](./PERIMETERS.md).

## Architecture

Helm v2 provides an enterprise-grade web conversation interface for SHAPER-OS universes.

```
                    Internet (https://ia.szde.fr)
                                 │
                     ┌───────────▼───────────┐
                     │ Cloudflare Zero Trust │
                     └───────────┬───────────┘
                                 │ (univ8-tunnel / cloudflared)
                     ┌───────────▼───────────┐
                     │   univ8-helm (:8650)  │
                     │  - React 19 Frontend  │
                     │  - Express 5 API      │
                     │  - Deepgram STT/TTS   │
                     └───────────┬───────────┘
                                 │ HTTP / SSE (Bearer Auth)
                     ┌───────────▼───────────┐
                     │ univ8-bridge-opencode │
                     │       (:4440)         │
                     └───────────────────────┘
```

## Features
- **Console cockpit (`/console`)**: Primary operator UI — chat, GED, voice STT/TTS integrated (P2).
- **Streaming Markdown & Rich Content**: Real-time token streaming with syntax highlighting, mermaid diagrams, and artifact cards.
- **Voice Recognition (STT)**: Live audio streaming to Deepgram Nova-2 with karaoke timing and voice activity detection (in-console, not a separate `/talk` page).
- **Multi-tenant / Multi-conversation**: Isolated conversation workspaces mapped to bridge sessions.
- **Edge Deployment**: Directly exposed through Cloudflare Tunnel on `ia.szde.fr`.
