# Univers — modèle d'isolation et rôle de vault

**Type :** architecture conceptuelle — **rien de codé** pour vault/univers à ce jour.
**Date :** 24/07/2026
**Décision :** chaque **univers** est un **écho-système** autonome ; le **vault maître**
de l'univers remplace **freetier** pour les secrets **à l'échelle de cet univers**.

Voir aussi : [`PLAN-VAULT-V1.md`](./PLAN-VAULT-V1.md) · [`PLAN-CODEX-V1.md`](./PLAN-CODEX-V1.md) ·
[`PLAN-SYMPHONY-PILOT.md`](./PLAN-SYMPHONY-PILOT.md) · freetier-v1 `/apps/freetier-v1/app`.

---

## 1. État actuel — vault est-il codé ?

| Composant | État juillet 2026 |
|-----------|-------------------|
| **`vault-v1` app** | ✅ Espace tb noweb ; ❌ code — pilote `/opt/vault-pilot/` à venir |
| **`codex-v1` app** | ❌ Pas codé — plan + slices fichier pilote |
| **`maestro-v1`** | ✅ En prod (orchestration, stream, scheduler) |
| **`helm-v2`** | ✅ En prod (cockpit humain) |
| **`freetier-v1`** | ✅ En prod — catalogue **global** de clés API free tier |

**Conclusion :** vault = **design uniquement**. Les secrets vivent encore dans
`passwd`, `.env`, `/opt/bridge/*/.env` et freetier-v1.

---

## 2. Qu'est-ce qu'un univers ?

Un **univers** (`universe`) est une **frontière d'isolation** : un écho-système
qui regroupe tout ce qui appartient au même périmètre opérationnel.

```
┌─────────────────────────────────────────────────────────────┐
│  UNIVERS « gbs-symphonie »                                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ vault    │  │ codex    │  │ maestro  │  │ helm-v2  │   │
│  │ (maître) │  │ (context)│  │ (exec)   │  │ (humain) │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┴──────┬──────┴─────────────┘          │
│                            │                                │
│  ┌─────────────────────────┼─────────────────────────────┐  │
│  │  Ressources              │                             │  │
│  │  • agents (subs/bridges) │  • apps tb (helm, maestro…) │  │
│  │  • machines / nœuds      │  • MariaDB (scopes)         │  │
│  │  • workspaces            │  • conteneurs (futur)       │  │
│  └─────────────────────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Propriétés d'un univers

| Propriété | Description |
|-----------|-------------|
| **Isolation** | Secrets, contexte, runs et ressources d'un univers ne fuient pas vers un autre sans export explicite |
| **Vault maître** | Une autorité secrets par univers — source unique pour render vers fichiers / env conteneur |
| **Codex local** | Catalogue de contexte agent (briefings, blueprints) scoped à l'univers |
| **Maestro scope** | Lanes, tasks, subs rattachés à l'univers |
| **Écho** | Chaque univers est un **sous-système répliquable** (h1 pilote → bs1 deploy) |

### Exemples d'univers (cibles)

| Slug | Description | Hôte pilote |
|------|-------------|-------------|
| `gbs-symphonie` | Infra agentique helm + maestro + bridges | gbs-h1 → bs1 |
| `wordavo` | Apps pédagogiques sciento | zerux / sciento |
| `freetier-legacy` | Transitoire — catalogue global actuel | freetier-v1 |

---

## 3. Vault maître — le connecteur de l'univers

Le **vault maître** d'un univers est le **point de vérité** qui relie les autres
briques **sans les mélanger** :

```
                    ┌─────────────────┐
                    │  VAULT MAÎTRE   │
                    │  (par univers)  │
                    └────────┬────────┘
         secrets            │            noms seulement
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         bridges         apps tb      conteneurs
         (.env render)   (passwd)     (env inject)
              │             │             │
              └─────────────┼─────────────┘
                            │
              codex ← secret_ref (jamais la valeur)
              maestro ← render avant run
              helm ← périmètre controlScope
```

| Vault fait | Vault ne fait pas |
|------------|-------------------|
| Stocker mots de passe, tokens, clés API | Stocker briefings / contexte LLM → **codex** |
| `vault render` → fichiers ou env conteneur | Orchestrer des tâches → **maestro** |
| Références nommées pour agents (`CLOUDFLARE_API_TOKEN`) | Chat humain → **helm** |
| Audit qui a rendu quoi, quand | Catalogue free tier global → **freetier** (transitoire) |

---

## 4. Freetier → Vault : remplacement au niveau univers

### Aujourd'hui (freetier-v1)

- Catalogue **global** multi-comptes email (GBS, PRO, MUSICA, Theta…)
- Health checks, modèles, export clés
- **Hors** du périmètre d'un seul déploiement infra
- Utile pour **découvrir** et **tester** des providers gratuits

### Demain (par univers)

| Avant (freetier) | Après (vault univers) |
|------------------|----------------------|
| Clé OpenRouter « Theta » globale | `OPENROUTER_API_KEY` dans vault `gbs-symphonie` |
| Clé Ollama « PRO » | `OLLAMA_API_KEY` scoped univers |
| Export manuel vers bridge `.env` | `vault render bridge-claude` automatique |
| UI catalogue providers | UI vault : secrets de **cet** univers seulement |

### Migration prévue (pas de big-bang)

```
Phase A — Import ponctuel (manuel, pilote)
  freetier export (email/compte) → vault set global <SECRET_NAME>
  Une clé, un univers, un render test

Phase B — freetier reste catalogue « découverte »
  Nouveaux comptes free tier → toujours enregistrés freetier
  Clés **validées pour prod infra** → copiées dans vault univers

Phase C — freetier réduit (optionnel, lointain)
  freetier = annuaire signup + health sandbox
  vault = seule source pour apps/bridges/maestro en prod
```

> **Règle :** on n'importe pas tout freetier d'un coup. Une clé validée par
> univers, via tâche maestro documentée.

### Mapping freetier → vault (exemple `gbs-symphonie`)

| Secret vault | Origine freetier actuelle | Usage |
|--------------|---------------------------|-------|
| `OPENROUTER_API_KEY` | Theta OpenRouter #32 ou future clé GBS | Kimi K3, DeepSeek, GLM |
| `OLLAMA_API_KEY` | PRO Ollama #28 | minimax-m3, nemotron gratuit |
| `GROQ_API_KEY` | GBS Groq #17 | voix ack helm (pas agent) |
| `DEEPGRAM_API_KEY` | hors freetier | STT |
| `CLOUDFLARE_API_TOKEN` | hors freetier | controlScope |

---

## 5. Inventaire par univers — agents, ressources, conteneurs

Chaque univers maintient un **registre** (futur : table `universe_resources` ou codex slice `infra_blueprint`) :

| Type | Exemples | Géré par |
|------|----------|----------|
| **agent** | cursor-bridge, claude-bridge, sub maestro | maestro lanes + vault env |
| **app** | helm-v2, maestro-v1, codex-v1 | turbinobash + vault render |
| **machine** | gbs-h1, bs1, gbs-p2 | codex blueprint + maestro node |
| **container** | (futur) service vault runtime, worker | vault `type: container_env` |
| **secret_ref** | nom logique → vault path | vault uniquement |
| **context_slice** | briefing, norme locale | codex |

```
universe: gbs-symphonie
├── vault_master: /opt/vault/gbs-symphonie/   (futur)
├── codex: /apps/codex-v1 (scope=gbs-symphonie)
├── maestro: lanes infra, app, ops
├── helm: sessions gbs-h1/helm-v2/*
├── agents:
│   ├── cursor-bridge :4310
│   └── claude-bridge :4320 + litellm :4330
├── apps:
│   ├── helm-v2
│   ├── maestro-v1
│   └── (futur) vault-v1, codex-v1
└── machines:
    ├── gbs-h1 (pilote)
    └── bs1 (deploy cible — gbs-p2 plein)
```

---

## 6. Relation avec la symphonie (maestro)

La **symphonie** = orchestration **à l'intérieur** d'un univers :

| Couche | Scope |
|--------|-------|
| **Univers** | Frontière isolation + vault maître |
| **Symphonie** | maestro orchestre agents/subs dans l'univers |
| **Vague pilote** | Incrément testable (voir `PLAN-SYMPHONY-PILOT.md`) |

Maestro ne remplace pas vault : il **consomme** le render vault avant chaque run.

---

## 7. Multi-univers / multi-hôte

| Scénario | Comportement |
|----------|--------------|
| h1 pilote, bs1 prod | Même slug univers, **vault export/import** chiffré ou render manifest versionné |
| Univers distincts | Vaults séparés, codex séparé, zero partage secret |
| gbs-p2 plein | Nouveau déploiement sur **bs1** = même univers, autre machine dans le registre |

---

## 8. Ce qu'on ne fait pas

- ❌ Fusionner vault + codex + freetier en une app
- ❌ Migrer toutes les clés freetier sans validation par univers
- ❌ Coder vault avant le pilote `/opt/vault-pilot/` validé
- ❌ Exposer les valeurs vault dans codex ou contexte LLM

---

## 9. Prochaines étapes documentées

| # | Action | Projet |
|---|--------|--------|
| 1 | Créer slug `gbs-symphonie` dans codex pilote (fichier) | codex-pilot |
| 2 | `/opt/vault-pilot/` + 1 secret test | vault pilote |
| 3 | Tâche maestro : inventaire secrets actuels vs registre univers | maestro |
| 4 | Script import **une** clé freetier → vault pilote (dry-run) | vault-v1 phase 1 |
| 5 | ~~`tb app create vault-v1`~~ ✅ | vault-v1 |

---

## 10. Glossaire

| Terme | Définition |
|-------|------------|
| **Univers** | Écho-système isolé : agents + ressources + vault maître + codex + maestro scope |
| **Vault maître** | Coffre secrets autoritaire d'un univers |
| **Écho** | Sous-système répliquable (même logique, autre hôte) |
| **Symphonie** | Orchestration maestro dans un univers |
| **secret_ref** | Nom logique côté agent — jamais la valeur |
| **Render** | Action vault qui écrit fichiers/env sans exposer au LLM |

---

*Dernière révision : 24/07/2026 — univers = unité d'isolation ; vault remplace freetier par univers ; vault non codé.*
