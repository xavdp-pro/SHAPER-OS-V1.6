# Feature — UI console

## Layout principal

`src/pages/Dashboard.jsx`

```
┌─────────────────────────────────────────┐
│ Header : titre session · ? · ⋮          │
├──────────┬──────────────────────────────┤
│ Sidebar  │ Zone scroll messages         │
│ sessions │ (RunTimeline)                │
│ stepper  │ [↓ Aller en bas] si décroché │
├──────────┴──────────────────────────────┤
│ ChatInput sticky (composer)             │
└─────────────────────────────────────────┘
```

## Scroll auto (stick-to-bottom)

Comportement attendu :

| Action utilisateur | Effet |
|--------------------|-------|
| En bas, stream actif | Scroll suit les nouveaux tokens |
| Scroll vers le haut | **Décrochage** — lecture libre |
| Retour en bas (scroll ou bouton) | **Raccrochage** — suivi reprend |
| Envoi message | Force raccrochage |

### Implémentation

| Ref / state | Rôle |
|-------------|------|
| `stickBottomRef` | autorise snap auto |
| `atBottom` | UI bouton « Aller en bas » |
| `lastScrollTopRef` | détecte scroll vers le haut |
| `NEAR_BOTTOM_PX = 80` | seuil « en bas » |

`onChatScroll` sur le conteneur scroll (`bindScrollRef`).

Effect `[timeline, streaming, atBottom]` : interval 48ms pendant stream si accroché.

**Fichier :** `Dashboard.jsx` (~l.130–200, ~1000–1030, ~1440)

## Bouton aide « ? »

- Composant : `ConsoleHelpButton` + `ConsoleHelpOverlay`
- Tour 11 étapes (FR/EN/ES)
- **Pulse** après présentation terminée : `helpNudge` + `getCompletedPrimeRun`
- Zephir invoque le **point d’interrogation** (pas le symbole seul)

## Reborn (menu ⋮)

- Remplace l’ancien « Vider conversation »
- Modale confirmation avec icône `RotateCcw`
- i18n : `clear.title`, `clear.confirm`, etc.

## Options menu (⋮)

- Filtres zones (thinking, tools, terminal, logs)
- Karaoké ON/OFF (si Cartesia)
- Copier / Stop / Reborn / Recharger

`src/components/HeaderActionsMenu.jsx`

## Présentation en cours

- `presentationBlocking` : input placeholder « Présentation en cours… »
- Hint : « Briefing en cours — tu peux déjà écrire »
- Timeout auto : 30s Cursor / 90s Claude si prime bloqué

## Pull-to-refresh (mobile)

`usePullToRefresh` sur le scroll messages → `reloadPage` / soft reload timeline.

## Langue UI

Sélecteur drapeaux header → `LocaleContext` → prompts CLI + voix + prime alignés.

## Mobile

- Sidebar overlay `h-dvh`
- Wake lock pendant usage actif
- Safe area composer

## Chemins code UI

| Composant | Fichier |
|-----------|---------|
| Timeline | `RunTimeline.jsx` |
| Input | `ChatInput.jsx` |
| Stepper | `ConversationStepper.jsx` |
| Liste sessions | `ConversationListItem.jsx` |
| Aide | `ConsoleHelpOverlay.jsx` |
| Modèle actif | `ActiveModelLabel.jsx` |
