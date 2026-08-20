# Brick: Auth

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)  
> **Package**: `@shaper/auth`

## 1. Declarative Objective

Central Bearer token policy for mesh HTTP services — optional per service.

## 2. Invariants

1. Stateless verification only.
2. Disabled when no token configured.
3. Localhost or mesh bind only.
4. Podman Quadlet lifecycle.
