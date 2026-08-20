# Plan — `codex-v1` : registre de contexte & infra agentique

**Type :** plan + checklists — design uniquement.
**Projet séparé de `vault-v1`** — ne pas fusionner les codebases.
**Politique :** pas de migration ; pilotes sur h1 par petits bouts ; itérations
maestro jusqu'à stabilisation des briques infra-v2.
**Rythme :** [`PLAN-SYMPHONY-PILOT.md`](./PLAN-SYMPHONY-PILOT.md) — commencer par un
**fichier slice** (vague 2) avant l'app codex-v1 (vague 3).
**Home futur :** `/apps/codex-v1/app/mds/`

Chaque **codex** est scoped à un **univers** — voir [`UNIVERSE-V1.md`](./UNIVERSE-V1.md).

Voir aussi : [`PLAN-VAULT-V1.md`](./PLAN-VAULT-V1.md) (secrets), maestro-v1,
helm-v2 `contextDigest.js` / `controlScope.js`.

---

## 1. Problème

Aujourd'hui le **contexte agent** est éclaté :

| Morceau | Où |
|---------|-----|
| Briefing opérateur | `users.briefing` (helm-v2) |
| Périmètre contrôle (domaines CF…) | `.env` + `controlScope.js` |
| Digest session | `CONTEXT.md` / `_kovzu/` (helm) |
| Mission tâche | `tasks.context_json` + prompt (maestro) |
| Normes / skills | `agentSkills.js` (générique, code) |
| Leçons erreurs | `lessons` (maestro, partiel) |

**Manques :**

1. Pas de **catalogue versionné** des descriptions d'infra à faire digérer avant un run.
2. Pas de **recette de concaténation** stable (quoi inclure, dans quel ordre).
3. Pas de lien explicite **chat_id / conversation** ↔ snapshot de contexte pour qu'un sub reprenne exactement le même briefing.
4. Pas de boucle **itérative** documentée : maestro construit infra-v2 par morceaux jusqu'à « stable ».

---

## 2. Rôle de codex-v1 (vs vault, maestro, helm)

```
                    ┌─────────────┐
   humain ─────────▶│  helm-v2    │  chat, voix, édition briefing
                    └──────┬──────┘
                           │ lit / écrit slices
                    ┌──────▼──────┐
                    │  codex-v1   │  registre contexte + infra (texte versionné)
                    │  - slices   │
                    │  - recipes  │
                    │  - digests  │
                    └──────┬──────┘
                           │ GET digest avant run
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        maestro-v1    helm prime    subs (bridge)
        (task run)    (session)     (chat_id dédié)
              │
              │ secrets = noms seulement
              ▼
        vault-v1  (mots de passe — jamais dans le digest)
```

| Couche | Question | Projet |
|--------|----------|--------|
| **Secrets** | Quel mot de passe / token ? | `vault-v1` |
| **Contexte** | De quoi l'agent doit-il être briefé ? | `codex-v1` |
| **Exécution** | Qui lance quoi, quand ? | `maestro-v1` |
| **Humain** | Qui dialogue ? | `helm-v2` |

---

## 3. Concepts (noms code anglais)

| Concept | Description |
|---------|-------------|
| **slice** | Morceau de contexte nommé (briefing, infra blueprint, norme locale…) |
| **recipe** | Ordre et règles de concaténation des slices pour un type de run |
| **digest** | Texte final assemblé, hash/versionné, prêt à injecter |
| **binding** | Lien `chat_id` ou `task_id` ↔ digest_id (reprise exacte) |
| **blueprint** | Description d'une brique infra cible (ex. « infra-v2 scheduler ») |
| **stability** | Marqueur humain « OK » sur une brique — fin d'itération maestro |

---

## 4. Types de slices

| Type | Exemple | Scope | LLM |
|------|---------|-------|-----|
| `operator_briefing` | Présentation Zephir, préférences | user / global | oui |
| `control_scope` | Domaines Cloudflare contrôlés (sans token) | deployment | oui |
| `infra_blueprint` | Spec d'une brique infra-v2 | project | oui |
| `agent_norm` | Règles locales (pas les skills génériques code) | global / app | oui |
| `task_context` | Snapshot workspace, fichiers clés | task | oui |
| `lesson` | Erreur passée + fix | app / lane | oui |
| `secret_ref` | **Référence** `CLOUDFLARE_API_TOKEN` existe | global | **nom seulement** |

Les **valeurs** de secrets restent dans **vault** ; codex ne stocke que les refs.

---

## 5. Recette de digest (avant lancement agent)

Exemple pour `maestro task run` :

```
1. agent_norm.global
2. control_scope.deployment
3. infra_blueprint.<target>        # si tâche infra
4. operator_briefing.<user>        # optionnel selon lane
5. task_context.<task_id>
6. lessons.matching.<signature>    # 0..n
7. secret_refs                     # noms de variables, jamais valeurs
8. footer maestro (RUN-REPORT…)    # inchangé côté maestro
```

API cible :

```
POST /api/digest/assemble
{
  "recipe": "maestro_task_run",
  "task_id": 42,
  "chat_id": "gbs-h1/maestro-v1/task-42",   # optionnel — reprise
  "user_id": 3,
  "blueprint_id": "infra-v2-scheduler"
}
→ { "digest_id": "…", "text": "…", "version": 7 }
```

Le sub reçoit le digest **une fois** au inject ; le `chat_id` bridge reste dédié
(`{node}/{user}/task-{id}`) pour la continuité de conversation.

---

## 6. Boucle itérative maestro → infra-v2

Objectif : utiliser **maestro** pour construire **infra-v2** (ou toute cible)
par itérations jusqu'à validation humaine.

```
humain rédige blueprint dans codex
        │
        ▼
maestro task (lane infra) — digest assemble depuis codex
        │
        ▼
sub exécute dans workspace cible
        │
        ▼
run report (maestro-report JSON) + lesson si échec
        │
        ▼
humain marque blueprint slice « stability: ok » OU nouvelle itération
        │
        └──▶ tâche suivante sur la brique suivante
```

**Règle :** une brique = un blueprint slice versionné ; pas de big-bang infra.
Maestro orchestre ; codex **mémorise** ce qu'on a dit aux agents et ce qui est stable.

---

## 7. Stockage (proposition V1)

| Option | Contenu | Chiffré ? |
|--------|---------|-----------|
| MariaDB `codex-v1` | slices, recipes, digests (texte), bindings | non (pas de secrets) |
| Fichiers `mds/` dans repo | blueprints infra en git (option) | non |
| `vault-v1` | mots de passe uniquement | oui |

Pas de mélange vault/codex en base. Si un slice contient un secret par erreur → rejet à l'ingestion.

---

## 8. Phases (petits bouts sur h1)

### Phase 0 — Doc + schéma

- [ ] `tb app sudo/way/noweb/create codex-v1` (quand prêt — pas avant vault pilote si surcharge)
- [ ] Tables : `slices`, `recipes`, `digests`, `bindings`, `stability_marks`
- [ ] `mds/AGENT-CONTEXT.md`, `ARCHITECTURE.md`

### Phase 1 — CRUD slices + assemble minimal

- [ ] `POST /api/slices` — créer / versionner un slice
- [ ] `POST /api/digest/assemble` — recipe `maestro_task_run` hardcodée d'abord
- [ ] Test : maestro `POST /tasks/:id/run` appelle codex pour le préfixe de prompt
- [ ] Zéro secret en clair dans les slices (lint / review)

### Phase 2 — Binding chat_id

- [ ] `bindings(chat_id, digest_id)` — reprise même briefing sur re-run
- [ ] Helm : option `digest_id` sur prime (plus tard, pas urgent)

### Phase 3 — Blueprints infra-v2

- [ ] Type `infra_blueprint` + UI admin simple (liste, version, marquer stable)
- [ ] Première boucle : une brique pilote (ex. « vault render hook »)
- [ ] Lessons maestro → auto-suggest nouveau slice `lesson` (manuel d'abord)

### Phase 4 — Intégration helm briefing

- [ ] Migrer **optionnellement** `users.briefing` vers slice `operator_briefing`
- [ ] helm continue de fonctionner si codex down (fallback briefing SQL)

---

## 9. Non-objectifs V1

- Remplacer maestro ou helm
- Stocker des mots de passe (→ vault)
- Migration des briefings existants obligatoire
- UI élaborée type zeruxfaq mini-GED
- Multi-machine / HA

---

## 10. Pourquoi un nom séparé (`codex-v1`) ?

| Si on étendait vault | Problème |
|---------------------|----------|
| Même app | Risque sécu : digest LLM à côté des secrets |
| Même nom « vault » | Confusion humaine : « est-ce chiffré ? visible agent ? » |
| Tout dans maestro | Mélange orchestration et catalogue de savoir |

**`codex-v1`** = codex / registre de connaissance contextuelle **destinée aux agents**.
**`vault-v1`** = coffre **fermé**.

Deux repos, deux apps turbinobash, deux ports — responsabilités claires.

---

## 11. Lien turbinobash + Docker (comme vault)

| Runtime | Comment le sub reçoit le digest |
|---------|----------------------------------|
| **PM2 / bridge** | Injecté dans le prompt au `run` (maestro / helm) |
| **Conteneur** (futur) | `GET /api/digest/assemble` au boot entrypoint → fichier ou env `CODEX_DIGEST_PATH` |

Même logique que vault : **une vérité codex**, plusieurs modes de livraison.

---

*Dernière révision : 24/07/2026 — projet séparé de vault ; itérations maestro → infra-v2.*
