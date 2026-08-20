# Orchestration dynamique — agent maître, agents subalternes, planification

Note de vision (23 juillet 2026). **Fil rouge depuis le début de la discussion :
ces mécaniques doivent vivre dans le CONTEXTE Cursor** (injectées au prime +
rappelées), pas seulement dans le code. Encodé dans `server/lib/agentSkills.js`.

## Philosophie : dynamique total

Xavier programme en **abstraction et dynamique totale** — métaphore : « comme un
PHP où le langage s'écrit lui-même ». Ce qu'on construit est **très dynamique** :
le système se façonne lui-même, les agents se créent et se configurent selon les
besoins. Ce n'est pas un logiciel figé, c'est un socle vivant.

## 1. Agent maître → agents subalternes

L'agent Cursor est **maître**. Parfois il est nécessaire qu'il **installe et
lance un agent Cursor CLI subalterne** — sur un espace turbinobash
(`tb app sudo/way/noweb/create …`) ou une autre machine — **avec un contexte que
le maître choisit lui-même** pour cet agent, puis lui délègue une mission.

→ Un agent peut donc en engendrer d'autres, chacun avec son propre contexte de
mission. Arborescence d'agents, pas un agent unique.

## 2. Planification (temps + événements)

Pour qu'un agent agisse **à heure fixe** ou **quand quelque chose change**, le
maître met en place la temporisation adaptée :
- `cron` (système), `systemd` (timer/service),
- ou un **cron maison** (boucle/scheduler applicatif) quand il faut plus de
  souplesse (déclenchement sur événement, backoff, dépendances).

Exemples : surveiller une boîte mail et agir, produire un rapport chaque lundi,
relancer une tâche tant qu'une condition n'est pas remplie.

## 3. Routage du modèle (juste ce qu'il faut)

Déterminer, **par tâche**, le bon niveau d'artillerie :
- **Tâche simple / rapide / répétitive** → un **modèle léger branché à du code**
  (peu cher, déterministe).
- **Tâche complexe / ouverte** → **artillerie lourde = agent Cursor CLI complet**
  (raisonnement, outils, itération).

Le choix se fait selon le besoin réel, jamais « le gros modèle par défaut ».
C'est ce qui rend l'ensemble économique ET puissant.

## 4. Reborn = repartir neuf avec un contexte choisi (PAS de zéro)

« Contexte Cursor » = le fichier/mécanique que Cursor utilise pour garder
l'historique de session. Le **reborn** :
1. **vide** la timeline / l'historique de la session,
2. **recharge le CONTEXTE choisi** (briefing + skills + mission),
3. l'agent **repart neuf sur la bonne mission** — avec des bases, pas amnésique.

Cette mécanique doit être **propre et bien expliquée dans le contexte de l'agent**
(il doit savoir comment elle marche, et pouvoir l'expliquer). C'est aussi elle
qu'on réutilise quand le maître **choisit le contexte** d'un agent subalterne
qu'il crée.

## Pouvoirs de l'agent (non-sudo dans l'app, mais root sur l'hôte) — TRÈS IMPORTANT

L'agent **n'est PAS sudo dans l'app** (il tourne en user applicatif, isolation
préservée). **MAIS** il a la capacité de se **connecter en SSH (clé) au HÔTE du
conteneur, en root**, pour **télécommander et façonner son univers/conteneur**
autant que nécessaire. Objectif : lui donner les **mains libres pour agir en
toute circonstance** et remodeler le conteneur (ressources, config, réseau,
services) sans jamais casser l'isolation de l'app.

- Dans l'app : user applicatif, pas de sudo.
- Vers l'hôte : **`ssh root@localhost`** → joint le HÔTE du conteneur et obtient
  root → contrôle total du conteneur (ressources, config, réseau, services).
- C'est le levier qui rend la télécommande d'infra réellement puissante :
  l'agent doit pouvoir **contrôler l'univers auquel on lui donne accès**.

(Encodé dans le contexte, `server/lib/agentSkills.js`.)

## En résumé

KovZu n'orchestre pas un agent, mais une **écologie d'agents dynamique** : un
maître qui crée des subalternes contextualisés, planifie leurs actions dans le
temps, route chaque tâche vers le bon niveau de modèle, et se régénère par reborn
sur un contexte choisi. **Le système se façonne lui-même** — c'est le cœur
dynamique de Shaper concrétisé. Voir [`CONCRETISER-SHAPER.md`](./CONCRETISER-SHAPER.md).
