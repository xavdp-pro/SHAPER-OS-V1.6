# Helm Voice — noms de machines au micro

> Problème résolu : le STT phonétise les noms d'infra (« k0 » entendu « cas0 », « gbs-h1 » massacré).
> Trois lignes de défense + épellation. Tests : `server/lib/voiceNormalize.test.js`.

## 1. Lexique boosté au STT

`server/lib/voiceLexicon.js` construit le lexique automatiquement — **rien n'est
formalisé en dur** : chaque déploiement client découvre SES machines à l'exécution.

Sources ssh, par priorité :
1. `VOICE_SSH_CONFIG` (env, chemins séparés par `:`) — override explicite par déploiement
2. `/apps/{mon-app}/.ssh/config` — home de l'utilisateur app (dérivé du chemin du code,
   convention turbinobash) ; les `Include` sont suivis (1 niveau)
3. `~/.ssh/config` de l'utilisateur qui fait tourner l'API

Plus : nœuds CLI (config) et canoniques de la table `voice_aliases`.
Envoyé en `keyterm` Deepgram à chaque ouverture micro (cache 30 s, max ~95 termes,
priorité : nœuds CLI → canoniques des alias → hôtes ssh).

## 2. Correcteur post-STT

`server/lib/voiceNormalize.js` — appliqué avant affichage/ack/envoi (`POST /api/voice/normalize`,
appelé par `useChatVoice.runVoiceTurn`) :

| Entendu | Corrigé | Mécanisme |
|---------|---------|-----------|
| « cas zéro » | gbs-k0 | alias (table `voice_aliases`) |
| « casse zéro » | gbs-k0 | alias flou phonétique |
| « GBS H 1 » | gbs-h1 | repli exact vs lexique |
| « gbs-p 2 » | gbs-p2 | fuzzy (fenêtres avec chiffre/tiret uniquement) |
| « golf bravo sierra tiret papa sept » | gbs-p7 | OTAN auto (≥2 mots OTAN, sans marqueur) |
| « épelle gé bé esse tiret ache un » | gbs-h1 | marqueur `épelle`/`spell`/`deletrea` + noms de lettres |

Déterministe (pas de LLM, <1 ms). Les mots normaux ne sont jamais touchés
(le fuzzy exige chiffre ou tiret dans la fenêtre).

## 3. Écho vocal des noms résolus

Quand des noms ont été corrigés, l'accusé Groq est remplacé par un écho déterministe :
« **Bien reçu — gbs-p7 et gbs-k0. Je m'en occupe.** » — le conducteur entend
l'interprétation avant exécution et peut dire stop. (`buildEntityAck`, `groqAck.js`.)

## Alias — /admin/voice-aliases

CRUD MariaDB (`voice_aliases`) : forme parlée → canonique. Quand le micro comprend
un nom de travers, ajouter l'alias une fois et c'est réglé définitivement.
API : `GET/POST /api/voice/aliases`, `DELETE /api/voice/aliases/:id`.
