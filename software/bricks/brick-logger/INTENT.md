# Brick: Logger

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)

## 1. Declarative Objective

Append-only JSONL audit stream for agents and pods.

## 2. Invariants

1. One JSON line per event — never mutated.
2. Persistent host volume.
3. Localhost or mesh bind only.
4. Podman Quadlet lifecycle.
