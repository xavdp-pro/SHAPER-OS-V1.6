# Incident : `tb app sudo/bulldozer helm-v2` casse les bridges (résolu 23/07)

## Symptôme
Les bridges cursor (4310) et claude (4320) tombaient en boucle de crash
(`Permission denied` sur leurs scripts `.sh`), et les outils front (`vite`,
`esbuild`, `playwright`) échouaient aussi en `Permission denied`/`EACCES`.
D'abord attribué à tort à un « durcissement du sandbox » — **c'est faux**.

## Cause réelle
`tb app sudo/bulldozer helm-v2` (lancé par Xavier pour aplanir les droits)
exécute :
```bash
find $d_app -type f -exec chmod 664 {} \;   # $d_app = /apps/helm-v2 (TOUT, récursif)
find $d_app -type d -exec chmod 2775 {} \;
```
Bulldozer est conçu pour du PHP/web classique (rien n'a besoin d'être
exécutable) et **retire le bit +x de tout fichier régulier sous
`/apps/helm-v2/`, sans exception de sous-dossier**. `app/`, `bridge/`, `sav/`,
`nosav/` — tous logés à la même enseigne.

**Conséquence importante** : déplacer `bridge/` vers `app/` ou `sav/` n'aurait
RIEN protégé — bulldozer frappe l'arbre entier, pas un dossier en particulier.

## Fix appliqué (immunise les bridges définitivement)

`chmod 664` retire l'exécution mais **pas la lecture**. Si le lanceur invoque
le script via un **interpréteur explicite** (`bash script.sh` au lieu de
`./script.sh`), le bit +x du fichier n'est plus nécessaire.

1. **`cursor-agent-bridge.service`** (systemd --user, helm-v2) :
   `ExecStart=/bin/bash /opt/bridge/cursor/start-bridge.sh`
2. **`claude-bridge.service`** :
   `ExecStart=/bin/bash /opt/bridge/claude/start-all.sh`
3. **`/opt/bridge/claude/start-all.sh`** : lance LiteLLM puis bridge via `bash …`

**Prouvé** : `chmod 664` appliqué à tous les `.sh` des deux bridges, puis
`systemctl --user restart` → les deux repassent `{"ok":true}` sans aucune
intervention manuelle.

## Ce qui reste fragile (irréductible dans `/apps/helm-v2`)

Les **binaires natifs** dans `app/node_modules` (`esbuild`) ne peuvent pas être
enveloppés par un interpréteur — un `chmod 664` dessus les rend inutilisables.
**23/07 (suite)** : tout le stack bridge déplacé sous **`/opt/bridge/`**
(serveurs + CLI + LiteLLM + `node_modules`) — hors `/apps/helm-v2/` et hors
backups / bulldozer. L’ancien dossier `/apps/helm-v2/bridge/` a été supprimé.

Après tout futur bulldozer sur l'app, lancer :
```bash
bash /apps/helm-v2/app/scripts/fix-exec-bits.sh
```
(restaure aussi le hook git pre-push si besoin — un `chmod` disque n'est pas
protégé par le mode `100755` enregistré dans git tant qu'on ne fait pas un
`git checkout` dessus).

## Recommandation

Éviter de lancer `tb app sudo/bulldozer helm-v2` en routine sur cette app —
ce n'est pas un simple flatten sans effet de bord pour un stack Node.js avec
bridges/scripts. Si nécessaire (permissions vraiment mélangées), lancer
ensuite `scripts/fix-exec-bits.sh` par réflexe.

## Mise à jour (23/07, même jour) : `vite`/`playwright` immunisés aussi

Un **second** bulldozer est survenu pendant la session (confirmé : `vite.js`
et consorts de nouveau en 664). `esbuild` (binaire natif, seul cas irréductible)
a été restauré par `fix-exec-bits.sh`. Pour `vite` et `playwright` — de simples
scripts JS, pas des binaires natifs — appliqué le même principe que les bridges :
`package.json` les invoque désormais via **`node` explicite** au lieu du
symlink `node_modules/.bin/…` :
```json
"build":   "node ./node_modules/vite/bin/vite.js build",
"preview": "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 7923",
"test:e2e":"node ./node_modules/@playwright/test/cli.js test"
```
**Prouvé** : build lancé avec `vite.js` toujours en 664 → succès. `build`,
`preview` et `test:e2e` sont donc immunisés définitivement. Seul reste
irréductible : les binaires natifs (`esbuild`, et les navigateurs Playwright —
mais ces derniers vivent dans `~/.cache/ms-playwright`, **hors** de l'arbre
`/apps/helm-v2/`, donc déjà hors de portée de bulldozer).
