# Brick: Agent

> **Intent Classification**: GENERIC INTENT (Universal / Parameterized Blueprint)  
> **Package**: `@shaper/agent` + bridge packages (`@shaper/bridge-agy`, etc.)

## 1. Declarative Objective

One generic agent brick — Maestro registers 1..N parameterized tasks (mail, ops, custom).

## 2. Invariants

1. **No brick-per-mailbox** — slug `mail-<local>-<domain>` is a registry entry, not a new image.
2. **Context via `contextPath`** — not a separate brick per universe.
3. Bridge CLI agnostic: agy, cursor, claude, opencode (HTTP Rule 8 contract).
4. Beat only while `GET /api/health` succeeds on the bridge.

### Illustrative Example (Non-Binding / Demonstration Only)

| Mailbox | Slug | Vault key |
| :--- | :--- | :--- |
| `contact@zoutik.shop` | `mail-contact-zoutik-shop` | `secret/mail/contact-zoutik-shop` |
| `xavier@xavdp.pro` | `mail-xavier-xavdp-pro` | `secret/mail/xavier-xavdp-pro` |

Credentials live in vault — never in the brick image.
