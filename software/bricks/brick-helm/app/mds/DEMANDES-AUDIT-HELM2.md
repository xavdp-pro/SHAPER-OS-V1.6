# Audit demandes → code helm-v2 (KovZu)

**Cible unique :** `/apps/helm-v2/app` · URL **https://helm2.xavdp.pro**  
**Ne pas travailler sur** helm-v1 (`helm.xavdp.pro`) ni cursorauto sauf demande explicite.

Date audit : 21 juil. 2026 · Agents parallèles ont parfois modifié helm-v1 → divergences.

---

## Règle agents (obligatoire)

| | |
|--|--|
| Code | `/apps/helm-v2/app` |
| Deploy | `cd /apps/helm-v2/app && npm run deploy` |
| Docs | `mds/INDEX-AGENTS.md` + ce fichier |
| Chat | français · Code | anglais |

---

## Synthèse conformité

| Statut | Légende |
|--------|---------|
| ✅ | Fait et présent dans helm-v2 |
| ⚠️ | Partiel / fragilisé / dépend config |
| ❌ | Demandé, pas (ou mal) dans helm-v2 |
| 🔁 | Fait sur helm-v1 seulement (à porter) |

---

## 1. Sessions & workspaces (juil. 2026)

| Demande | Statut | Où / note |
|---------|--------|-----------|
| Stepper 4 étapes (machine → user → path → confirm) | ✅ | `ConversationStepper.jsx` |
| Liste machines SSH longue + recherche | ✅ | `PickerMenu` tall |
| Explorateur dossiers distant | ⚠️→✅ | `remoteFs` : Host alias → `user@host` → `sudo -n -u` ; bridge si dispo |
| User select + croix vider + saisie libre | ✅ | étape User |
| Titre `asus / zaza / CURSOR` (dernier dossier) | ✅ | `sessionTriple` + `sessionNameFromPath` |
| Auto-nom session = dernier segment path | ✅ | `sessionNameTouched` |
| Routing inject sur bonne machine (acer/asus) | ✅ | `CLI_NODES` + register workspace |

---

## 2. Reborn & présentation Zephir

| Demande | Statut | Où / note |
|---------|--------|-----------|
| « Vider » → **Reborn** | ✅ | locales + menu |
| Reborn = wipe + re-prime | ✅ | `session/clear` |
| Présentation invite au **point d’interrogation** (mots, pas « ? ») | ✅ | `sessionPrime.js` FR |
| Lecture voix présentation **toute seule** | ✅ | `replaySpeech` à la fin du prime |
| Karaoké démarre **après** fin du stream texte | ✅ | Cartesia : TTS seulement sur `response_complete` |
| Signal « présentation en cours » | ✅ | point ambre + hint dans `ChatInput` |
| **Croix X** pour arrêter la présentation | ✅ | `onStopPresentation` → `handleStopPresentation` (visible **pendant** le briefing) |
| Nudge « ? » **uniquement après** fin présentation | ⚠️→✅ | Porté aujourd’hui : attendre aussi fin voix/karaoké |
| Nudge clignote un min puis s’arrête | ⚠️→✅ | Auto-dismiss 3 min (`HELP_NUDGE_AUTO_DISMISS_MS`) |
| Améliorer texte présentation | ✅ | consignes KovZu / Zephir / tour guidé |

---

## 3. Voix & karaoké

| Demande | Statut | Où / note |
|---------|--------|-----------|
| Voix dans le chat (pas page `/voice`) | ✅ | `useChatVoice` |
| Speaker ON/OFF | ✅ | prefs localStorage |
| Micro → STT → draft | ✅ | Deepgram WS |
| Mot déclencheur envoi (go / envoyer…) | ✅ | `voiceSendTrigger` |
| Groq ack avant Composer | ✅ | bulle + audio |
| Karaoké mot-à-mot Cartesia | ⚠️ | **Bloqué tant que `TTS_PROVIDER=deepgram`** — remis **cartesia** le 21/07 |
| Karaoké **sous** le markdown (ne pas masquer tableaux) | ✅ | `RunTimeline` bandeau « Lecture » |
| Karaoké **après** streaming réponse (pas pendant) | ✅ | accumulate + speak on `response_complete` |
| Play / pause / stop sur bulle | ✅ | |
| Anti double voix | ✅ | undouble + un seul `end()` Cartesia |
| Wake lock écran | ✅ | `useWakeLock` |
| Admin voix saved vs active | ✅ | `voiceSelectionState` + `AdminVoices` (stack, mismatch, karaoke) |

---

## 4. UI console

| Demande | Statut | Où / note |
|---------|--------|-----------|
| Scroll auto décroche en remontant | ✅ | `stickBottomRef` + scroll up |
| Scroll auto raccroche en bas | ✅ | `atBottom` + bouton « Aller en bas » |
| Tour guidé 11 étapes (?) | ✅ | `ConsoleHelpOverlay` |
| FR / ES / EN + force CLI locale | ✅ | |
| Liens bookmarkables `/console/...` | ✅ | |
| Pull-to-refresh mobile | ✅ | |

---

## 5. Auth / admin / livrables

| Demande | Statut | Où / note |
|---------|--------|-----------|
| Login email/mdp (pas magic link pour l’instant) | ✅ | |
| Admin users / briefing / agent name | ✅ | |
| Livrables (tables markdown, xlsx, charts) | ✅ | `locale.js` → `cursorOutputFormatDirectives` injecté via `sessionPrime` / `applyCursorLanguage` |
| Multi-CLI Cursor + Claude | ✅ | plugins |

---

## Pourquoi tu ne voyais pas certaines choses

1. **Mauvaise app** — agents ont touché **helm-v1** alors que prod KovZu = **helm2**.
2. **Deploy incomplet** — source plus récente que `dist/` (corrigé par redeploy).
3. **Karaoké OFF** — `TTS_PROVIDER` était Deepgram → `karaokeSupported = false` (toggle invisible / inactif). Remis **cartesia**.
4. **Croix présentation** — visible seulement pendant le briefing (`presentationBlocking`). Si la présentation est déjà finie, plus de X.
5. **Nudge « ? »** — se déclenchait trop tôt (fin texte) ou restait / disparaissait mal ; aligné avec helm-v1 (après voix + auto-dismiss).

---

## À améliorer en priorité

1. ~~TTS Cartesia pour karaoké~~ (fait 21/07)
2. ~~Nudge après karaoké + auto-dismiss~~ (fait 21/07)
3. ~~Porter admin `voiceSelectionState`~~ (fait 21/07 — deploy OK)
4. ~~Porter consignes livrables~~ (fait 21/07 — `locale.js` + prime)
5. ~~SSH browse fallback multi-cible~~ (fait 21/07)
6. Sync bridge asus `/api/fs/list` quand VPN OK (idéal vs SSH)
7. Auth magic links (VISION)
8. Documenter pour **tous** les agents : **helm-v2 only**

---

## Checklist test manuel (après deploy)

1. Hard refresh https://helm2.xavdp.pro
2. Menu ⋮ → Karaoke **ON** visible
3. Reborn → présentation parlée + bandeau Lecture (karaoké)
4. Pendant briefing : croix X à côté de « Briefing en cours »
5. Après fin voix : « ? » pulse + tooltip ; s’éteint après ~3 min ou au clic
6. Remonter le chat pendant stream → plus de scroll forcé ; redescendre → reprend
7. Titre session `machine / user / DERNIER_DOSSIER`
8. Admin → Voix : stack Cartesia, karaoke **oui**, mismatch clair si IDs hybrides
9. Demander un tableau markdown / mermaid → format livré (pas prose seule)
10. Stepper asus → browse path `/home/zaza/Bureau` (ou CURSOR)

---

## Sessions Cursor liées (contexte)

| Session | Contenu | Attention |
|---------|---------|-----------|
| [5e16752c…](5e16752c-c1cb-4fe1-8050-ab927677d3e9) | Voix / karaoké / infra (souvent helm-v1) | Ne pas confondre avec v2 |
| [0f9ca16e…](0f9ca16e-7b2e-4cc2-90fe-cdf61180b500) | Nudge ? + croix présentation | Implémenté d’abord sur **v1** |
| [ae6b430b…](ae6b430b-dc9d-4031-9f4f-8d969b34028d) | Admin voix, livrables | Beaucoup sur **v1** |
| Session courante | Stepper, Reborn, scroll, titres, audit | **helm-v2** |
