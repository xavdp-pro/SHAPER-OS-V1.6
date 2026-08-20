# Gouvernance Fractale & Conventions SHAPER-OS

Ce document formalise les règles d'architecture, les 4 niveaux fractals, les conventions de nommage et la pyramide de tests pour assurer la cohérence et la pérennité de l'écosystème **SHAPER-OS**.

---

## 1. Les 4 Niveaux d'Abstraction Fractals

> **Complément** : la loi produit **P1 / P2 / P3** est dans [`PERIMETERS.md`](./PERIMETERS.md). Les niveaux ci-dessous décrivent le **déploiement** (package → univers → hôte → flotte), pas le métier client.

Pour éviter toute confusion lors de l'évolution du système, chaque action, brique ou test doit être rattaché explicitement à son niveau :

| Niveau | Désignation | Périmètre | Périmètre & Responsabilité | Exemples |
| :---: | :--- | :---: | :--- | :--- |
| **0** | **Brique & Package** | P1/P2 | Composant atomique, testé unitairement (`node:test`). | `@shaper/vault` (P1), `@shaper/maestro` (P2), `brick-helm` (P2) |
| **1** | **Univers / Cellule** | P1+P2 | Stack Podman autonome (socle + agentique). **Pas** un vertical P3. | `UNIV8`, `UNIV9` |
| **2** | **Nœud Hôte** | infra | LXC / bare-metal portant les univers. | `gbs-univ8`, `gbs-univ9` |
| **3** | **Flotte / Réseau** | infra | Mesh, tunnels, domaines publics. | `ia.szde.fr` |

### Mapping P1 / P2 / P3 (loi produit)

| Périmètre | Contenu | Exemples |
| :--- | :--- | :--- |
| **P1** | Socle minimal | vault, logger, auth, queue, db |
| **P2** | Agentique + KovZu | maestro, bridges, helm, ged, rag |
| **P3** | Outils métier clients | market-intelligence, enterprise-chat, univ-sinistre |

---

## 2. Convention de Nommage Immuable

Pour assurer la traçabilité dans Git, Podman, les fichiers de logs et les bases de données :

| Élément | Règle de Nommage | Exemple Valide |
|---|---|---|
| **Univers** | `UNIV<N>` (Majuscules) | `UNIV8`, `UNIV9` |
| **Dossier Univers** | `SHAPER-OS/universes/univ<N>/` | `universes/univ9/` |
| **Brique Modèle** | `brick-<nom>` | `brick-helm`, `brick-mariadb`, `brick-vault` |
| **Package NPM Socle** | `@shaper/<nom>` | `@shaper/queue`, `@shaper/maestro`, `@shaper/db` |
| **Image Podman** | `localhost/shaper-<nom>:latest` | `localhost/shaper-helm:latest` |
| **Conteneur Podman Actif** | `univ<N>-<brique>` | `univ9-helm`, `univ9-mariadb`, `univ9-vault` |
| **Ports Standardisés** | `:8610` Vault<br>`:8620` Logger<br>`:8630` Maestro<br>`:8640` Queue<br>`:8650` Helm<br>`:4440` Bridge OpenCode<br>`:3306` MariaDB | Port fixe par univers ou bind localhost |

---

## 3. Pyramide de Tests Obligatoire

Aucun composant ne peut être intégré sans validation à 100% sur sa pyramide :

1. **Niveau 1 — Tests Unitaires Packages** (`node --test test/*.test.js`) :
   - Exécution ultra-rapide (< 1s), zéro dépendance externe, validation des fonctions pures.
2. **Niveau 2 — Tests d'Intégration & Scénarios PRA** :
   - Cold boot complet : Vault ➔ Logger ➔ MariaDB ➔ Queue ➔ Maestro ➔ Bridge ➔ Helm.
3. **Niveau 3 — Tests E2E Live Stack Conteneurisée** :
   - Validation en direct des conteneurs Podman, des routes HTTP/SSE, des tokens et de l'injection d'agent.

---

## 4. Politique de Sauvegarde Multi-Étapes (Checkpoints & Snapshots)

Chaque étape validée doit pouvoir être sauvegardée et restaurée sans ambiguïté :

1. **Sauvegarde Code (Git)** :
   - Commit granulaire par composant.
   - Tag Git immuable à chaque étape validée (ex: `tag: exp-001-univ8`, `tag: exp-002-univ9`).
2. **Sauvegarde Données (Snapshots Horodatés dans `sav/`)** :
   - **Dump MariaDB** : `sav/db/dump-<timestamp>.sql.gz`
   - **Secrets Vault** : `sav/vault/vault.enc`
   - **État Maestro / Tâches** : `sav/state/checkpoint.json` & `tasks.json`
3. **Rollback Express** :
   - Possibilité de restaurer un univers à une étape antérieure via script de snapshot/restore.
