# Brick: GED (Mini-GED Document Hub)

> **Intent Classification**: GENERIC INTENT (Sovereign Document Hub)

## 1. Declarative Objective

Sovereign persistent file & document storage hub (`/data/ged`) with responsive UI (Desktop + Mobile) for bulk uploads, classification, preview and downloads.

## 2. Invariants

1. Pure ESM zero-external-dependency Node 20 server.
2. Persistent host volume mounted on `/data/ged`.
3. Standalone micro-service decoupled from cockpit logic.
4. Podman Quadlet lifecycle.
