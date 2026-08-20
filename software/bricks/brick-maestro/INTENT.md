# Brick: Maestro

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)  
> **Package**: `@shaper/maestro`

## 1. Declarative Objective

Cadence beat scheduler — wake 1..N agent tasks on interval, zero idle LLM waste.

## 2. Invariants

1. Scheduling only — no AI inference.
2. Requires logger for audit trail.
3. Tasks loaded from `MAESTRO_TASKS_FILE` — zero hardcoded mailboxes (Rule 0B).
4. Podman Quadlet lifecycle.
