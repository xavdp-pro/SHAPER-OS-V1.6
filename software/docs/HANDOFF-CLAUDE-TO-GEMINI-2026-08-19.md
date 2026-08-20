# 🤝 Handoff — Claude → Gemini (Antigravity)

> **Historical snapshot** — 2026-08-19. Verify all claims against the repo before acting.  
> **Active law**: [`PERIMETERS.md`](./PERIMETERS.md) · [`DOC-INDEX.md`](./DOC-INDEX.md).

> **De** : Claude (Opus 5), session Claude Code du 19 août 2026, ~15h  
> **À** : Gemini / Antigravity, agent de la session `8dfc7b6b`  
> **Objet** : Relecture croisée de REMOTE2 après ta journée de travail — écarts constatés, corrections proposées  
> **Statut** : Constats vérifiés, **aucune modification appliquée**. Rien n'est fait sans arbitrage de Xavier.

---

## 0. Pourquoi ce document

Salut Gemini.

Xavier m'a demandé de repasser sur les 4 projets de `REMOTE2` après ta session d'aujourd'hui. Mon premier passage était une lecture d'infrastructure — `README`, `topology.json`, manifests, ton journal d'archi. J'ai conclu trop vite sur un point, Xavier m'a repris, et j'ai relu `MANIFESTO.md`, `RULES.md` et les 90 messages de votre conversation.

Ce document te transmet ce que j'ai trouvé, **y compris là où je me suis trompé**. L'idée n'est pas de corriger ton travail — il est solide — mais de te signaler quatre écarts que tu es mieux placé que moi pour trancher, puisque tu as le contexte de la journée.

Je travaille sous les mêmes lois que toi : Règle 0 (français entre nous, anglais pour le code), Loi 4 (l'humain est la boussole), politique de silence de `topology.json`.

---

## 1. Ce que j'ai eu faux — et que tu avais raison de faire

**Mon erreur** : j'ai signalé `UNIV7/`, `UNIV8/`, `UNIV9/` à la racine comme des « doublons orphelins » à supprimer, au motif qu'ils sont hors git et divergents du canonique.

**C'est faux.** La **Section 6 du MANIFESTO** les définit explicitement comme des *Sandboxes d'Exploration Parallèles*, briques du Protocole de Distillation Multi-Track en 4 étapes :

> Exploration libre dans `UNIV-X/` → Polir → Distiller le blueprint → Promouvoir dans `SHAPER-OS/`, puis détruire ou archiver.

Hors-git et divergents, **c'est le design**. Je l'avais lu comme un accident de copier-coller. Corrigé de mon côté — je le note ici pour qu'aucun agent qui relira ce doc ne refasse la même erreur, et surtout pour qu'aucun ne « nettoie » ces répertoires en croyant bien faire.

---

## 2. Écart réel : la distillation UNIV9 est à moitié faite

C'est le point qui compte, et il est plus fin que ce que j'avais dit.

La divergence UNIV9 va dans **les deux sens**, ce qui n'est pas prévu par le protocole :

| Direction | Contenu | Interprétation |
| :--- | :--- | :--- |
| Canonique **seulement** | Brique `univ9-ged` (port 8660), mode DEV Vite/HMR (`NODE_ENV`, `VITE_DEV`, 5 montages sources) | Code promu ✅ |
| Sandbox **seulement** | `harmonized-socle`, `maestro-agent-cadence`, `socle-integration`, `univ9-helm` (4 fichiers de tests) | Tests **non** promus ❌ |

Le canonique `podman-up.sh` fait 150 lignes, le sandbox 131. L'étape 3 (distiller) a été faite pour le code, pas pour la preuve. Et l'étape 4 (détruire ou archiver le sandbox) n'a pas été exécutée — le sandbox reste vivant et reçoit encore des écritures.

Conséquence concrète : `SHAPER-OS/universes/univ9/` n'a **qu'un seul** fichier de test (`univ9-live-socle.test.js`), alors que le sandbox en a 5. La couverture réelle du canonique est plus faible que ce que la matrice du journal laisse penser.

**Ma proposition** — à toi de valider, tu connais l'intention derrière :
1. Promouvoir les 4 fichiers de tests du sandbox vers `universes/univ9/test/` (en corrigeant les chemins d'import, cf. §4)
2. Snapshot d'archive du sandbox (il y a déjà `UNIV9/sav/snapshots/UNIV9_exp-002-pass_20260818_212923.tar.gz`)
3. Puis clore l'étape 4 proprement

---

## 3. 🔴 Violation doctrinale : secrets en dur, commités et poussés

Le point le plus urgent. Deux clés API réelles en valeur de repli dans les scripts de déploiement :

```bash
export DEEPGRAM_API_KEY="${DEEPGRAM_API_KEY:?DEEPGRAM_API_KEY required}"
export GROQ_API_KEY="${GROQ_API_KEY:?GROQ_API_KEY required}"
```

**Portée** : 4 fichiers, dont **2 tracés dans git et présents dans HEAD** :
- `universes/univ8/deploy/podman-up.sh`
- `universes/univ9/deploy/podman-up.sh`

Le dépôt `xavdp-pro/univ-shaper-os` est **privé** — ce n'est donc pas une fuite publique. Mais les clés sont dans l'historique, et le motif `${VAR:-valeur_réelle}` contourne silencieusement un `.gitignore` qui est par ailleurs correct (`.env`, `resources/*.local.json` bien couverts).

Les tokens Cloudflare sont aussi tracés : `universes/univ{8,9}/sav/tunnel/token`, `sav/opencode-bridge/token`.

**Ce que ça viole** :
- **Loi 5 — Pure Paramétrisation** : « Tout est fonction paramétrée. Aucune IP, hostname ou credential en dur. »
- **Règle 0B — Zero Hardcoded Environment Residue** : « Never hardcode […] static credentials into code, scripts, or specifications. »

**Correction proposée** : rotation des deux clés, puis bascule du motif permissif vers un motif qui échoue franc :

```bash
# ❌ le défaut silencieux masque l'absence de config et fige un secret
export DEEPGRAM_API_KEY="${DEEPGRAM_API_KEY:?DEEPGRAM_API_KEY required}"

# ✅ échec explicite au boot, zéro résidu dans le script
export DEEPGRAM_API_KEY="${DEEPGRAM_API_KEY:?DEEPGRAM_API_KEY requis — voir deploy/univ9.env}"
```

Note que c'est cohérent avec la Loi 3 (adaptabilité dynamique) : le `:?` n'est pas un mur statique, c'est un garde-fou qui dit *ce qui manque* au lieu de démarrer avec un secret fantôme. Le vault existe déjà pour ça (`brick-vault`, `:8610`) — l'idéal serait que ces deux clés y transitent comme les autres.

---

## 4. Bug réel : 3 suites de tests univ8 ne démarrent pas

```
universes/univ8/test/harmonized-socle.test.js       → ERR_MODULE_NOT_FOUND
universes/univ8/test/maestro-agent-cadence.test.js  → ERR_MODULE_NOT_FOUND
universes/univ8/test/socle-integration.test.js      → ERR_MODULE_NOT_FOUND
```

Cause : chemins relatifs hérités de l'époque où UNIV8 vivait **hors** de `SHAPER-OS/`.

```js
// ❌ résout vers universes/SHAPER-OS/packages/… → inexistant
import { createVaultServer } from '../../SHAPER-OS/packages/vault/index.js';

// ✅ depuis universes/univ8/test/, il faut remonter de 3 niveaux
import { createVaultServer } from '../../../packages/vault/index.js';
```

Une remontée de niveau manquante, **4 imports × 3 fichiers** (`vault`, `logger`, `maestro`, `bridge-agy`). Correction purement mécanique.

⚠️ **Point d'attention pour toi** : ce bug échouerait **partout**, y compris sur `gbs-univ9`. Or ton journal annonce une matrice **100% PASS** sur les trois niveaux. Les deux peuvent être vrais si la prod tourne un jeu de fichiers différent, mais l'écart mérite une vérification de ton côté — tu as accès à l'hôte distant, pas moi.

---

## 5. État live constaté (local, 19/08 ~15h)

Résultat brut : **54/64 tests passent, 10 échecs**, répartis en deux causes distinctes.

```
socle univ8 :  8610 ✅ 200   8620 ✅ 200   8640 ✅ 200   8630 ✅ 200
               4440 ✅ 401 (Bearer attendu, normal)
               8650 ❌ injoignable  ← univ8-helm non démarré
socle univ9 :  aucun conteneur en vie
```

| Cause | Tests | Nature |
| :--- | :--- | :--- |
| Imports cassés (§4) | 3 | **Bug code** — à corriger |
| Stack non démarrée | 7 | **Environnement** — pas un bug |

Les 7 tests live (`univ8-helm` ×3, `univ8-live-stack`, `univ9-live-socle` ×3) sont des tests d'intégration qui exigent la stack up. Ils ne révèlent rien de cassé en soi.

Conteneurs actifs : `shaper-{vault,logger,bridge-agy,maestro}` (32h), `univ8-{vault,logger,bridge-opencode,queue,maestro}` (20h), `wiki-mariadb-test`.

---

## 6. Ce que j'ai retenu de la journée avec Xavier

Pour que tu saches sur quelle base je te parle — j'ai relu les 90 messages de la session `8dfc7b6b`. La direction qu'il a donnée, telle que je la comprends :

- **Livrables riches** (xlsx, docx, images) téléchargeables dans le chat — « faire mieux que ChatGPT ou Claude », sans leur plafond de documents, *parce qu'on a un vrai OS Linux sous les pieds*
- **Podman jetables ou persistants** fabriqués d'office dans le socle, avec une **hygiène explicite** : combien on en garde, lesquels sont permanents, qui nettoie
- **Mini-GED** comme brique séparée avec plugin — séparation stricte code ≠ data
- **Vault contextuel** : login/pass déposés dans le chat → vault, mais *reliés à un contexte* (il a plusieurs identités : gbsinfo, xavdp.pro, autres)
- Un **vrai assistant administratif** qui sait développer *et* faire de l'admin Linux, avec la doc SHAPER-OS dans son contexte initial pour maîtriser DEV/TEST/PROD
- Un socle **viable pour des clients** : dupliquable, dépôt git propre, stratégie de backup
- Et au-dessus : **le niveau fractal supérieur**, celui qui garde tout de leur côté

Ta Section 7 (`Le Ventre de KovZu vs La Voie Shaper OS`, commit `6c86fb0`) répond directement à sa demande la plus insistante :

> « ce qu'on fait nous c'est pour étendre kovzu, ce que fait l'agent c'est étendre les outils du super-humain. Il faut noter la différence — je ne sais pas, dis-moi, mais c'est important cette distinction. »

C'est bien vu, et c'est structurant : sans cette frontière, l'agent grossit KovZu à chaque demande et le ventre redevient le monolithe que la doctrine refuse. La Règle de Décision Instantanée (§7.3) est ce qui la rend opérationnelle plutôt que déclarative.

---

## 7. Ordre d'attaque proposé

| # | Action | Nature | Qui |
| :--- | :--- | :--- | :--- |
| 1 | Roter les 2 clés API, passer en `${VAR:?}` | Violation Loi 5 + risque réel | Xavier (rotation) + agent (patch) |
| 2 | Corriger 4 imports × 3 fichiers univ8 | Bug mécanique | Agent |
| 3 | Vérifier le 100% PASS annoncé sur `gbs-univ9` | Écart doc/réel | **Toi** (accès distant) |
| 4 | Finir la distillation UNIV9 (promouvoir tests → archiver sandbox) | Étape 4 incomplète | Toi + Xavier |
| 5 | Relancer `univ8-helm` + socle univ9 | Environnement | Agent |

Les points 3 et 4 te reviennent : tu as l'accès à l'hôte distant et l'intention derrière les choix d'hier, moi non.

---

## 8. Note de méthode

Je n'ai **rien modifié**. Pas un fichier, pas un commit, pas un conteneur. Tous les constats ci-dessus sont vérifiés par lecture et par exécution des tests, jamais par déduction.

Là où je me suis trompé (§1), c'est parce que j'ai lu l'infrastructure avant la doctrine. Leçon retenue et transmise : **dans SHAPER-OS, `MANIFESTO.md` et `RULES.md` se lisent avant `topology.json`.** Ce qui ressemble à un accident structurel est souvent une loi qu'on n'a pas encore lue.

Bonne suite,  
**Claude**

---

> *Document rédigé sous Rule 0 (français pour la collaboration humain-agent) et Rule 0C (haute densité de signal, zéro boilerplate).*
