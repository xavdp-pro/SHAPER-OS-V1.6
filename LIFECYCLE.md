# Lifecycle — DEV, TEST, PROD (reference)

A project is **three sealed universes**, not one folder you “make more careful”.

```
<univ_slug>-dev     explore, break, vibe
        ↓
<univ_slug>-test    rebuild from zero, run all tests, then DESTROY
        ↓
<univ_slug>-prod    created once; later updates by git tag, data stays
```

The first laptop stack in [`START-HERE.md`](./START-HERE.md) is **DEV**.  
Calling it production does not make it production.

---

## Why three

- **DEV** can be messy. That is the point.  
- **TEST** proves you can **raise the system from nothing** (disaster recovery, not only “curl on a warm machine”).  
- **PROD** stays up. You do not vibe-code on it.

If TEST can be created by the same intent + tags that PROD will use, you have a recovery plan. If TEST is a leftover DEV disk, you have a superstition.

---

## DEV

- Name: `<univ_slug>-dev`  
- On when you work; off when you do not need it.  
- Git branch: whatever you use to explore.  
- Mail: stub or a throwaway box.  
- Allowed: change bricks, fail tests, throw the universe away.

---

## TEST (rebuild, then destroy)

This is the **PRA** step: *Plan de reprise d’activité* — prove you can restore from scratch.

1. Empty machine or empty LXC/VM (not “the DEV folder with extra packages”).  
2. OS update, Podman, clone software at a **known git tag**.  
3. Bootstrap vault with **test** secrets.  
4. Build or pull **tagged** images.  
5. Deploy from the universe manifest.  
6. Run unit + integration tests. All green.  
7. **Destroy** the TEST universe (and the throwaway VM if you created one).

Destroy-after-test is mandatory. A kept TEST becomes a second DEV and stops proving recovery.

You may run several TEST universes in parallel (`<univ_slug>-test-a`, …) if they do not share disks or production mail.

Target: a full TEST raise should stay in the same order of minutes as a cold boot of the stack (the software repo aims under two minutes for the core; host provisioning is extra).

---

## PROD

**First time:** create `<univ_slug>-prod`, inject production secrets into vault, start, keep volumes on dedicated mounts (`/data/<univ_slug>/` or equivalent).

**Later updates:**

1. TEST has already passed on that **tag**.  
2. On PROD: fetch and check out `v1.x.y` (immutable).  
3. Restart services. **Do not** recreate data volumes.  
4. Health + a Maestro beat. Fail → roll back to the previous tag.

PROD mail, domains, and tunnel tokens never leak into DEV/TEST files.

---

## Git (simple)

```
explore on a branch
    → tag v1.x.y only after TEST from scratch is green
        → PROD pulls that tag
```

No production deploy from an untagged `main` “because it worked on my laptop”.

---

## How this meets the first proof

| [`PROOF.md`](./PROOF.md) steps 0–3 | Lifecycle |
| :--- | :--- |
| First local stack | DEV |
| Optional public `/console` | still DEV unless you named it prod and used prod secrets |
| Rebuild on a blank VM, tests, destroy | TEST / PRA — do this **before** real customers |
| Tagged images + persistent volumes | PROD |

---

## Agent rules (short)

- Never write production passwords into a DEV or TEST vault file.  
- Never skip destroy-after-test “to save time”.  
- Never update PROD by copying files from DEV. Use a tag.
