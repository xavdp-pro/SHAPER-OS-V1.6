# Feature — Sessions & workspaces

## Modèle de données

```
machine / user / nom_session
     │      │         │
     │      │         └── identifiant court (ex. CURSOR, NOW2, Interface)
     │      └── utilisateur Linux distant (ex. zaza)
     └── host SSH ou nœud bridge (ex. asus, acer, gbs-h1)
```

- **URL bookmarkable :** `/console/asus/zaza/CURSOR`
- **Workspace absolu :** enregistré séparément via `POST /api/conversations/register`
- **Titre UI :** `asus / zaza / CURSOR` (dernier segment du workspace, pas le chemin complet)

## Stepper nouvelle session

Composant : `src/components/ConversationStepper.jsx`

| Étape | Validation | UI |
|-------|------------|-----|
| Machine | host sélectionné | `PickerMenu` searchable, modale haute (~90% viewport) |
| User | non vide | select + input libre, options depuis machines + zaza/helm-v2/root/xavier |
| Path | commence par `/` | `WorkspacePicker` |
| Confirm | path + workspace | nom session éditable, preview |

### Nom session auto

```javascript
// src/lib/workspaceTemplates.js
sessionNameFromPath('/home/zaza/Bureau/CURSOR') // → 'CURSOR'
sessionNameFromPath('/apps/helm-v2/app')        // → 'helm-v2'
```

Flag `sessionNameTouched` : si l’utilisateur édite le nom, ne plus écraser avec l’auto.

## Explorateur distant (WorkspacePicker)

`src/components/WorkspacePicker.jsx`

- Racines rapides : `~`, `~/Bureau`, `/apps/{user}/…`
- Fil d’Ariane + liste dossiers
- API : `GET /api/fs/browse?machine=&user=&path=`

Backend : `server/lib/remoteFs.js`

1. Tente bridge `GET /api/fs/list` si machine bridgée
2. Sinon SSH direct (`ls` sans sudo cassé)

## Enregistrement session

```javascript
// client
registerConversation({ path: 'asus/zaza/CURSOR', workspace: '/home/zaza/Bureau/CURSOR' })
```

Serveur : `setConversationWorkspace` → bridge `POST /api/conversations/workspace`

## Affichage liste / header

`src/components/ConversationListItem.jsx` → `sessionTriple()`

```javascript
{
  machine, user, project,  // project = label court (CURSOR)
  cwd,                     // chemin workspace complet (tooltip)
  label,                   // sessionNameFromPath(cwd) || project
}
```

## Machines connues (juillet 2026)

| Machine | Bridge | Browse FS | Usage |
|---------|--------|-----------|-------|
| gbs-h1 | oui :4310 | oui | dev helm-v2 |
| acer | oui | oui | NOW2 zaza |
| asus | oui (health OK) | SSH fallback | CURSOR / NOW3 |

## Pièges agents

1. **Ne pas** créer `gbs-h1/zaza/NOW2` si le projet vit sur **acer**
2. Purger les sessions h1 orphelines si mauvais routage historique
3. Le **nom** session (`NOW3`) ≠ dossier workspace si mal configuré — le titre UI suit le **cwd** en priorité
4. 744 hosts SSH dans config → modale machine en mode `tall` + recherche obligatoire

## Tests

`src/lib/workspaceTemplates.test.js`
