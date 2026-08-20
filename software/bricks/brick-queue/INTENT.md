# Brick: Queue

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)  
> **Package**: `@shaper/queue`

## 1. Declarative Objective

In-memory async job queue — no external broker.

## 2. Invariants

1. Lifecycle: `PENDING` → `RUNNING` → `COMPLETED` | `FAILED`.
2. Ephemeral — no persistence in this brick.
3. Localhost or mesh bind only.
4. Podman Quadlet lifecycle.
