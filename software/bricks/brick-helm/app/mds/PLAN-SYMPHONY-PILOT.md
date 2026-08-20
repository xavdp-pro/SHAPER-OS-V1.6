# Plan — Symphonie pilote : grandir ensemble, petit à petit

**Type :** feuille de route transversale — coordonne vault, codex, maestro, helm.
**Principe :** on **pilote ensemble** au fur et à mesure ; pas de big-bang, pas
d'attendre qu'un projet soit « fini » avant de brancher le suivant.
**Politique :** chaque vague = un morceau jouable de bout en bout sur **gbs-h1**.
**Repos séparés** (vault ≠ codex) mais **rythme de pilote unique**.
**Univers :** chaque pilote vit dans un slug univers (ex. `gbs-symphonie`) —
voir [`UNIVERSE-V1.md`](./UNIVERSE-V1.md).

Voir : [`PLAN-VAULT-V1.md`](./PLAN-VAULT-V1.md) · [`PLAN-CODEX-V1.md`](./PLAN-CODEX-V1.md) ·
maestro-v1 `mds/VISION.md`.

---

## 1. La symphonie (métaphore → réalité)

| Instrument | Projet | Rôle dans l'orchestre |
|------------|--------|------------------------|
| **Chef d'orchestre** | `maestro-v1` | Lance les runs, schedule, alertes, stream |
| **Musiciens** | subs (bridge) | Exécutent dans un workspace isolé |
| **Partition** | `codex-v1` | Contexte versionné, digests, briefings infra |
| **Coffre** | `vault-v1` | Secrets — jamais sur la partition LLM |
| **Directeur** | `helm-v2` | Humain : chat, voix, briefing, délégation future |

```
helm (humain) ──▶ maestro (chef) ──▶ sub (musicien)
                      │                    ▲
                      ├── codex (partition)│
                      └── vault (coffre)───┘ env fichiers, pas dans le prompt
```

**Aujourd'hui (juillet 2026)** la symphonie **joue déjà** en version réduite :
maestro 0.5 (stream, scheduler, conductor), helm-v2 cockpit, contexte éclaté
(SQL briefing, `context_json`, fichiers). Les prochains pilotes **enrichissent**
sans tout refondre.

---

## 2. Règle d'or du pilote

> **Une vague = une brique testée en conditions réelles + une tâche maestro qui la documente.**

- Pas de migration de l'existant.
- Pas d'app complète avant le besoin.
- D'abord **dossier pilote** ou **fichier** ; ensuite **API** ; ensuite **UI**.
- Chaque vague laisse la symphonie **jouable** — on n'arrête pas maestro pour construire vault.

---

## 3. Vagues pilotes (ordre suggéré)

### Vague 0 — Baseline *(déjà en place)*

| Quoi | État |
|------|------|
| Maestro tasks / runs / lanes | ✅ |
| Scheduler `at` + `run_after` | ✅ |
| Conductor + subscriptions | ✅ |
| Stream live `TaskStream` | ✅ |
| Helm briefing `users.briefing` | ✅ |
| Secrets fichiers `passwd` / `.env` | ✅ (status quo) |

**Prochain geste humain :** choisir la **première brique infra** à automatiser
(ex. hook vault render, ou blueprint codex pour une lane).

---

### Vague 1 — Coffre pilote (1 secret, 1 fichier)

**Objectif :** prouver vault **sans toucher** la prod.

| Étape | Livrable |
|-------|----------|
| 1.1 | Dossier `/opt/vault-pilot/` + `sops` + clé `age` test |
| 1.2 | Un secret partagé pilote (ex. token CF **copie test**, pas prod) |
| 1.3 | `vault render` → **un seul** fichier cible (ex. `.vault-pilot/out/test.env`) |
| 1.4 | Tâche maestro « vérifier render » (lane infra, run report) |
| 1.5 | Humain valide : fichier OK, apps prod **inchangées** |

**Codex / helm :** rien. Maestro seul exécute et documente.

---

### Vague 2 — Partition pilote (1 slice, sans app)

**Objectif :** catalogue de contexte **avant** l'app codex-v1.

| Étape | Livrable |
|-------|----------|
| 2.1 | Dossier `/apps/codex-pilot/` (ou `mds/codex-pilot/` dans maestro) |
| 2.2 | Un fichier `slices/infra-v2-vault-hook.md` (blueprint vague 1) |
| 2.3 | Script ou helper maestro : concatène slice + `context_json` au `run` |
| 2.4 | `chat_id` dédié `gbs-h1/maestro-v1/task-{id}` — déjà le modèle bridge |
| 2.5 | Tâche maestro itère sur la brique jusqu'à run report `success` |
| 2.6 | Humain marque « stable » dans le markdown ou un tag maestro |

**Vault :** peut rester en vague 1. **Helm :** inchangé.

---

### Vague 3 — Codex minimal (1 endpoint)

**Objectif :** extraire le helper en petite app.

| Étape | Livrable |
|-------|----------|
| 3.1 | `tb app create codex-v1` (turbinobash, h1) |
| 3.2 | Table `slices` + `digests` ; import du slice pilote vague 2 |
| 3.3 | `POST /api/digest/assemble` — recipe `maestro_task_run` |
| 3.4 | Maestro `dispatchTask` appelle codex avant inject sub |
| 3.5 | Binding `task_id` ↔ `digest_id` en DB |

**Vault :** toujours pilote séparé. Pas de secrets dans codex.

---

### Vague 4 — Vault app (1 secret prod partagé)

**Objectif :** premier secret **réel** rendu vers une cible existante.

| Étape | Livrable |
|-------|----------|
| 4.1 | `tb app create vault-v1` |
| 4.2 | Manifeste : 1 secret global → 1 fichier `etc/...` d'une app pilote |
| 4.3 | `vault render <app>` en cron maestro ou hook post-deploy |
| 4.4 | Slice codex « comment lire ce secret » (noms seulement) |
| 4.5 | Lesson maestro si échec |

**Critère go :** l'app pilote lit le fichier comme avant ; une seule source vault.

---

### Vague 5 — Helm branché (optionnel, quand stable)

| Étape | Livrable |
|-------|----------|
| 5.1 | Prime session : option `digest_id` ou auto depuis codex |
| 5.2 | Chat → tâche maestro (CHAT-STREAMING.md) |
| 5.3 | UI admin codex : liste slices, marquer stable |

---

## 4. Boucle d'itération (chaque vague)

```
1. Écrire / mettre à jour le slice (codex ou fichier pilote)
2. Créer ou planifier une tâche maestro (lane adaptée)
3. Run → stream → run report JSON
4. Échec ? → lesson + nouvelle itération
5. Succès ? → marquer stable → vague suivante ou brique suivante
```

C'est la **même symphonie** qui grossit : le chef (maestro) ne change pas de
logique ; on ajoute des partitions (codex) et des coffres (vault) au fur et à mesure.

---

## 5. Ce qu'on ne fait pas pendant le pilote

- ❌ Migrer les 11 `.env` d'un coup
- ❌ Fusionner vault + codex dans une app
- ❌ Attendre codex-v1 complet avant le premier render vault
- ❌ Arrêter maestro / helm pour « préparer l'infra »
- ❌ Docker / API runtime secrets (après turbinobash stable)

---

## 6. Où vivent les docs

| Document | Contenu |
|----------|---------|
| **Ce fichier** | Rythme pilote transversal |
| `PLAN-VAULT-V1.md` | Design coffre secrets |
| `PLAN-CODEX-V1.md` | Design registre contexte |
| maestro `VISION.md` | Vision symphonie / lanes / subs |
| maestro `RUN-REPORT.md` | Contrat retour machine |

Quand une vague est validée, cocher les phases correspondantes dans vault/codex
et noter la date en bas de ce fichier.

---

## 7. Prochain pas concret (suggestion)

**Vague 1 — démarrer maintenant :**

1. Créer `/opt/vault-pilot/` sur h1 (structure + README pilote).
2. Tâche maestro : « documenter état secrets CF sur h1 » (recon, pas de changement).
3. En parallèle : rédiger le slice `infra-v2-vault-hook.md` (vague 2, fichier seul).

Deux petits fils, une symphonie qui commence à tenir la partition et le coffre.

---

*Dernière révision : 24/07/2026 — pilote intégré, croissance par vagues.*
