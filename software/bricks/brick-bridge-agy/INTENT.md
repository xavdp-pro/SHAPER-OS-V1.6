# Brick: Bridge AGY

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)  
> **Package**: `@shaper/bridge-agy`

## 1. Declarative Objective

HTTP/SSE bridge to Antigravity CLI — Rule 8 agent container contract.

## 2. Invariants

1. Endpoints: `/api/health`, `/api/inject`, `/api/events`, `/api/metrics`.
2. Localhost or mesh bind only.
3. API keys from env or vault — never in image.
4. Podman Quadlet lifecycle.
