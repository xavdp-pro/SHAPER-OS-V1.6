# Plan UX chat — pour agent Composer 2.5

**Destiné à :** l'agent IA "Composer 2.5" (autre outil, pas cette session).
**Cible code obligatoire :** `/apps/helm-v2/app` · prod https://helm2.xavdp.pro
**Interdit :** toucher `/apps/helm-v1/app` ou cursorauto sauf demande explicite.
**Ne pas committer** sans validation humaine. Avant push : `npm run test:chat` doit
passer (hook `pre-push` déjà en place, gate dur sur les tests unitaires).
Lire d'abord [`INDEX-AGENTS.md`](./INDEX-AGENTS.md) et [`regles.md`](./regles.md).

Origine : audit manuel du 24/07/2026 — parcours complet reborn → header →
composer → rendu des réponses, sur le chat helm-v2 tel qu'il tourne en prod.
Ceci est un **plan d'amélioration UX**, pas un rapport de bug : rien n'est
cassé, ce sont des frictions d'expérience utilisateur à polir.

---

## Ce qui marche déjà bien (ne pas casser)

- `PresentationWait` pendant le reborn/prime : message clair, l'utilisateur
  peut déjà écrire pendant le briefing.
- Re-prime auto d'une conversation vide (`maybePrimeEmpty`) avec garde
  anti-boucle + timeout.
- Mode simple non-admin qui masque réflexion/outils/terminal/logs.
- Karaoké intégré dans la prose markdown sans casser tableaux/code.
- Richesse des contrôles voix (pause/stop/lecture/micro + états visuels).
- `aria-label` / `aria-pressed` / `role` très présents (accessibilité).

---

## Plan — Phase 1 : gains rapides (impact fort, effort faible)

### 1.1 Le bouton Envoyer devient Stop pendant le streaming
**Problème :** pendant qu'une réponse streame, aucun Stop visible. Le bouton
Envoyer (`src/components/ChatInput.jsx:585-596`, `type="submit"`, icône
`ArrowUp`, spinner `Loader2` si `sending`) est juste désactivé. Le vrai Stop
existe seulement dans le menu ⋯ (`src/components/HeaderActionsMenu.jsx:208-215`,
`onClick={() => { onStop(); setOpen(false); }}`).

**Attendu :** quand `agentBusy`/`sending` est vrai, le bouton principal du
composer change d'icône (`Square`) et d'action (`onStop`) au lieu d'être
juste un spinner désactivé. Garder le Stop du menu ⋯ en secours.

**Fichiers :** `ChatInput.jsx` (bouton submit ~L585-596), doit recevoir
`onStop`/`agentBusy` en props depuis `Dashboard.jsx`.

- [ ] Faire remonter `onStop`/`agentBusy` en props de `ChatInput`
- [ ] Bouton submit : si `agentBusy`, afficher `Square` + `onClick={onStop}`
      au lieu de `type="submit"` désactivé
- [ ] Garder le Stop du menu ⋯ intact (redondance voulue, pas un doublon à supprimer)
- [ ] Vérifier au clavier (Enter n'envoie pas pendant que le bouton est en mode Stop)

### 1.2 Libellé "Reborn" pas clair pour un non-technique
**Problème :** le dialogue de confirmation (`Dashboard.jsx:1536-1575`,
`clear.title`/`clear.confirm` dans `src/lib/locale.js`) explique bien
l'action dans le corps du texte, mais le bouton lui-même s'appelle juste
"Reborn" — jargon interne, pas parlant pour un dirigeant non-tech.

**Attendu :** libellé utilisateur clair (ex. "Recommencer à zéro"), "Reborn"
peut rester en sous-titre/tooltip pour l'équipe interne.

- [ ] Modifier `locale.js` : `clear.confirm` / `clear.title` (FR + ES + EN)
- [ ] Vérifier que `clear.body` reste cohérent avec le nouveau libellé
- [ ] Ne pas renommer les clés i18n (juste le texte affiché) pour ne pas
      casser d'autres références

### 1.3 Composer surchargé (jusqu'à 7 boutons collés)
**Problème :** en zone d'action du composer (`ChatInput.jsx` ~L460-600) on
trouve à la suite : croix effacer brouillon, pause/stop voix, lecture,
micro, trombone, envoyer — jusqu'à 7 cibles tactiles serrées, surtout gênant
en mobile/étroit.

**Attendu :** regrouper le secondaire (trombone + lecture voix) derrière un
bouton "plus" ou les rendre visibles seulement au survol/quand pertinents
(ex. lecture voix seulement si une lecture est en cours). Le noyau visible
en permanence = micro + envoyer.

- [ ] Identifier quels boutons sont conditionnels (déjà `voicePlaying` etc.)
      vs. toujours visibles
- [ ] Regrouper trombone + éventuel bouton secondaire dans un sous-menu ou
      les masquer si non pertinents à l'instant T
- [ ] Tester au doigt sur viewport mobile réel (pas juste DevTools) que
      les cibles restantes ont un espacement suffisant (min ~40px)

---

## Plan — Phase 2 : fluidité de conversation

### 2.1 Impossible d'écrire pendant que l'agent répond
**Problème :** `canSend` (`ChatInput.jsx:241`) est `false` dès que `sending`
est vrai — impossible de préparer/enchaîner un message pendant un run en
cours, alors qu'une architecture de queue orchestrateur existe déjà côté
serveur (voir `mds/ORCHESTRATEUR-QUEUE.md`, `mds/AGENT-QUEUE-ARCHITECTURE.md`)
mais n'est pas branchée sur ce chemin.

**Attendu :** autoriser la saisie pendant un run ; à la soumission pendant
un run actif, mettre en file (badge "en attente") au lieu de bloquer le
textarea.

- [ ] Étudier si `AGENT-QUEUE-ARCHITECTURE.md` couvre déjà ce cas d'usage
      côté serveur, ou si c'est à construire
- [ ] Découpler `disabled` du textarea de `sending` (garder `disabled` lié
      seulement à `!activePath`)
- [ ] Décider du contrat : soit file d'attente serveur, soit envoi différé
      côté client au `response_complete` du run en cours
- [ ] Feedback visuel clair "message en attente" tant que le run précédent
      n'est pas terminé

### 2.2 Écran vide sans conversation active
**Problème :** sans conversation sélectionnée, seul un placeholder texte
("Sélectionne une conversation") occupe l'écran — aucune amorce pour un
utilisateur non-technique découvrant l'outil.

**Attendu :** un état d'accueil avec 3-4 exemples de commandes cliquables
(ex. "Quel est mon CA de la semaine ?", "Fais-moi un export PDF de…") qui
pré-remplissent le composer ou démarrent directement une conversation.

- [ ] Localiser le rendu de l'état vide (`Dashboard.jsx`, zone principale
      quand `!activePath`)
- [ ] Ajouter 3-4 cartes/chips d'exemples (texte en `locale.js`, pas en dur)
- [ ] Clic sur une carte = pré-remplit le draft ou lance directement le tour

### 2.3 Boutons d'action de réponse en colonne latérale
**Problème :** dans `RunTimeline.jsx` (`AssistantBlock`, colonnes
`flex flex-col gap-1 shrink-0` aux lignes ~166 et ~544, avec
`CopyCodeButton` L363/L545), les actions (copier, lecture voix) sont en
colonne à droite de chaque bulle — sur écran étroit ça empiète sur les
tableaux/code larges.

**Attendu :** passer ces actions en barre horizontale discrète sous la
réponse, visible au survol (desktop) ou toujours visible mais fine (mobile),
plutôt qu'en colonne latérale fixe.

- [ ] Repérer les deux occurrences de la colonne d'actions dans
      `RunTimeline.jsx` (~L166 et ~L544, probablement bulle normale vs bulle
      dans le bloc prime/présentation)
- [ ] Remplacer par une barre sous le contenu, `opacity-0 group-hover:opacity-100`
      sur desktop, visible en permanence sur tactile (pas de hover mobile)
- [ ] Revérifier que le karaoké/replay restent cliquables sans décalage de
      layout pendant le streaming

---

## Plan — Phase 3 : plus subtil, polish continu

### 3.1 Densité d'icônes muettes
**Problème :** header (langue, aide `?`, panneau canvas, menu ⋯) et
composer sont surtout des icônes sans texte. Le bouton d'aide `?` existe
déjà (bien) mais reste à découvrir.

**Attendu :** pas de refonte lourde — envisager un tooltip systématique
(`title=`, déjà présent sur plusieurs boutons du composer d'après le grep)
sur TOUS les boutons d'icône du header, et vérifier qu'aucun bouton n'est
sans `title`/`aria-label`.

- [ ] Audit rapide : `grep -n "title=" src/components/HeaderActionsMenu.jsx`
      et header dans `Dashboard.jsx` — combler les manques
- [ ] Ne pas ajouter de texte visible partout (surcharge visuelle) — le
      tooltip suffit, c'est un filet de sécurité pour la découvrabilité

---

## Checklist de validation finale (avant push)

- [ ] `npm run test:chat` vert (gate du hook pre-push)
- [ ] Test manuel desktop : reborn → écrire pendant briefing → réponse
      streamée → Stop visible et fonctionnel → composer pas surchargé visuellement
- [ ] Test manuel mobile (vrai viewport tactile) : composer utilisable au
      doigt, pas de bouton mal ciblé
- [ ] Mode non-admin : vérifier qu'aucune des modifications n'expose de
      nouveau élément technique (thinking/tools/terminal/logs) aux non-admins
- [ ] Karaoké + tableaux/code toujours corrects après changement de layout
      des boutons de réponse
- [ ] Aucune régression sur `clear.*` (Reborn) dans les 3 langues (FR/ES/EN)

---

## Ordre conseillé

1. **1.1** (Stop dans le composer) — le plus gros gain perçu, effort minime
2. **1.2** (libellé Reborn) — trivial, juste des chaînes i18n
3. **1.3** (dégonfler le composer) — visuel, sans logique nouvelle
4. **2.3** (actions de réponse en barre) — visuel, sans logique nouvelle
5. **2.2** (écran d'accueil) — ajout isolé, pas de risque de régression
6. **2.1** (saisie pendant streaming) — le plus gros morceau, touche à
   l'orchestration ; à faire en dernier et avec le plus de tests
7. **3.1** (tooltips) — en continu, pas bloquant

Rien ici n'a été codé dans cette session : c'est uniquement le plan et les
checklists, à charge de Composer 2.5 (ou toute autre session) de les
implémenter et de revenir avec les fichiers modifiés pour revue humaine.
