# Feature — Voix, karaoké & présentation

**Prod gbsinfo (gbs-tools)** : https://ia.gbsinfo.org — `TTS_PROVIDER=deepgram` (Cartesia quota 402).

## Architecture voix in-chat

```
Micro (STT Deepgram Nova live WS /api/voice/stt-stream)
    → draft ChatInput
    → mot déclencheur (« go » / « clear »)
    → Groq ack (bubble + audio HTTP POST /v1/speak)
    → inject Composer (agy / Antigravity)
    → SSE stream réponse (texte d’abord)
    → TTS WS /api/voice/tts-stream → Aura PCM (phrase complète en fin de tour)
    → karaoké : phrase en cours (Deepgram) ou mot à mot (Cartesia)
```

Hook central : `src/hooks/useChatVoice.js`  
Branché dans : `src/pages/Dashboard.jsx`

Le chat **n’envoie pas** le TTS token par token : un seul `Speak` + `Flush` à `response_complete`, pour éviter le double son. Le protocole Deepgram est bien du streaming PCM (chunks ~2 ko).

## Toggle speaker & karaoké

| Pref localStorage | Clé |
|-------------------|-----|
| Lecture auto | `helm-voice-playback` (défaut ON) |
| Karaoké | `helm-voice-karaoke` (défaut ON) |

Karaoké **supporté** dès qu’un TTS est configuré (`cartesia` ou `deepgram`).  
Menu ⋮ → Karaoke ON/OFF.

## Cartesia vs Deepgram (18 août 2026)

| | Cartesia Sonic WS | Deepgram Aura WS |
|--|-------------------|------------------|
| Chat TTS | `wss://…/api/voice/tts-stream` | idem |
| Audio | PCM 24 kHz | PCM 24 kHz (`linear16`) |
| Timestamps API | `word_timestamps` | **aucun** (Flush / `sequence_id` seulement) |
| Karaoké | mot à mot (`grain: word`) | **phrase en cours** (`grain: sentence`) |
| Horloge lecture | PCM `getPlaybackSeconds()` | idem + durée PCM `getDurationSeconds()` |
| Admin Tester | HTTP `POST /api/voice/tts` | HTTP (pas le WS du chat) |

Deepgram ne dit pas « on est sur ce mot ». On découpe le texte lu en phrases (`splitKaraokeSentences`), on les étale sur l’horloge PCM, on allume **toute la phrase** dont `[start, end]` contient le curseur. Quand le flux audio est complet, les fenêtres sont recadrées sur la durée réelle (`rescaleKaraokeUnits`).

On **ne flush pas** une phrase Deepgram à chaque point (limite 20 Flush / 60 s, voix hachée).

Fichiers :

| Fichier | Rôle |
|---------|------|
| `src/lib/karaokeTiming.js` | phrases, durées, index |
| `src/lib/pcmStreamPlayer.js` | horloge + durée PCM |
| `src/lib/voiceTtsStream.js` | proxy WS navigateur |
| `server/lib/deepgramTtsWs.js` | Speak / Flush Aura |
| `src/components/MarkdownContent.jsx` | surlignage `grain: sentence` |

Tests : `src/lib/karaokeTiming.test.js`

Env chat : `TTS_PROVIDER=deepgram` (+ réglage `app_settings.tts_provider`).

## Présentation (prime run)

### Cycle de vie

1. `shouldPrimeSession(timeline)` → true si vide ou prime échoué sans assistant
2. `POST /api/session/prime` ou clear orchestré
3. Run timeline `{ type: 'run', prime: true, status: 'running' }`
4. Inject message `[session prime]` → réponse Zephir
5. `response_complete` → run `status: 'done'`
6. **Auto** : `replaySpeech(assistantText)` + pulse bouton aide

### Fichiers

| Fichier | Rôle |
|---------|------|
| `server/lib/sessionPrime.js` | Prompt briefing + consigne point d’interrogation |
| `src/hooks/useSessionPresentation.js` | clearSession, primeSession |
| `src/lib/sessionPresentation.js` | helpers prime |
| `Dashboard.jsx` | effect auto-replay + helpNudge |

### Reborn

`clearSession` = wipe + prime. Présentation **doit** repartir seule (voix + karaoké).

### prepareForPresentation()

Reset pipeline Composer sans tuer tout (appelé au début du prime).

### inject SSE pendant prime

`handleVoiceEvent` : sur `inject`, `stopComposerPlayback()` seulement (pas full pipeline kill).

Pendant prime actif : **ignorer** live SSE TTS → une seule lecture via replay à la fin.

## Bug double voix (historique)

Symptôme : deux voix superposées, surtout karaoké Cartesia sur asus/NOW3.

| Fix | Où |
|-----|-----|
| `undoubleText` / `undoubleSpeechText` | `runStream.js`, `voiceCursorLoop.js` |
| Ignorer `response` interim si Cartesia | `useChatVoice.js` `handleVoiceEvent` |
| Ignorer `run_complete` pour parler | `feedStreamSpeech` lifecycleOnly |
| Un seul `end(utterance)` Cartesia | `enqueueSpeechChunksStream` |
| `spokenGuardRef` 8s | `feedStreamSpeech` final |
| `composerFinalized` synchrone avant enqueue | idem |

Tests : `runStream.test.js`, `voiceCursorLoop.test.js`

## Karaoké vs markdown affiché

**Règle :** ne jamais remplacer le livrable markdown par le karaoké. Le TTS lit une piste séparée (`speechTextFromAssistant`) ; la bulle reste tables / charts / liens.

Le surlignage est **dans** `StreamingMarkdown` (`proseWithKaraoke`) :

- Cartesia : un mot (`activeIndex`)
- Deepgram : la plage `wordStart`–`wordEnd` de la phrase active

TTS : `speechTextFromAssistant` + conversion tableaux → prose (`voiceCursorLoop.js`).

## Replay manuel

Bouton ▶ sur chaque bulle assistant → `replaySpeech(text, { id })`.

Pause/resume/stop : `togglePause`, `stopPlayback`.

## Wake lock

Pendant lecture / micro / présentation : écran reste allumé (`useWakeLock.js`).

## Admin voix

`/admin/voices` — voir `voiceSelectionState()` :

- `saved` : DB MariaDB
- `active` : ce que le chat utilise
- `mismatch` : IDs Cartesia encore en base alors que le chat est Deepgram (`aura-2-agathe-fr` etc.)
- Karaoke : `oui (phrases)` si Deepgram, `oui (Cartesia)` si Sonic
- Onglets catalogue Cartesia / Deepgram + bouton **Utiliser … pour le chat**

## Test manuel rapide

1. Hard refresh https://ia.gbsinfo.org — Karaoke ON (⋮)
2. Envoyer un message (ou Reborn pour la présentation)
3. Attendre la **fin** du texte Composer, puis la voix Deepgram
4. La **phrase** lue est surlignée dans la bulle (pas un mot qui saute)
5. Une seule voix, pas de doublon

## Test manuel présentation

1. Session vide ou Reborn
2. Attendre texte présentation
3. Voix + karaoké partent **sans** clic ▶
4. Zephir mentionne « point d’interrogation »
5. Bouton ? pulse après présentation
6. Réponse suivante en mode voix : **une seule** voix, pas de doublon
