/**
 * Détection de nouveau déploiement côté client.
 *
 * helm-v2 est servi par `vite preview` : une fois l'app chargée, l'onglet (ou la
 * PWA) garde son bundle en mémoire indéfiniment. Un `npm run deploy` ne change
 * donc rien pour les clients déjà ouverts tant qu'ils ne rechargent pas à la main.
 *
 * On sonde `index.html` (servi en `no-store`) et on compare le hash du bundle
 * `assets/index-XXXX.js` à celui chargé au démarrage. S'il diffère, un nouveau
 * build est en ligne.
 *
 * Le service worker est `selfDestroying` et ne précache rien : il n'y a pas de
 * cache à purger, un `location.reload()` suffit.
 */

const POLL_MS = 60_000;
const BUNDLE_RE = /assets\/index-[A-Za-z0-9_-]+\.js/;

/** Hash du bundle réellement exécuté par cet onglet. */
function currentBundle() {
  // import.meta.url pointe sur le module courant, donc sur le bundle en cours.
  const own = String(import.meta.url || '').match(BUNDLE_RE);
  if (own) return own[0];
  const tag = document.querySelector('script[type="module"][src*="assets/index-"]');
  const fromTag = String(tag?.getAttribute('src') || '').match(BUNDLE_RE);
  return fromTag ? fromTag[0] : '';
}

/** Hash du bundle actuellement servi par le serveur. */
async function deployedBundle(signal) {
  const res = await fetch(`/?_=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  if (!res.ok) return '';
  const html = await res.text();
  const m = html.match(BUNDLE_RE);
  return m ? m[0] : '';
}

/**
 * Démarre la surveillance. `onUpdate(reload)` est appelé une seule fois quand un
 * nouveau build est détecté ; à la charge de l'appelant de décider *quand*
 * recharger (on ne coupe pas un tour de voix en cours).
 *
 * @param {(reload: () => void) => void} onUpdate
 * @returns {() => void} arrêt de la surveillance
 */
export function watchForUpdate(onUpdate) {
  const mine = currentBundle();
  // Pas de hash exploitable (dev/HMR) → rien à surveiller.
  if (!mine) return () => {};

  let stopped = false;
  let notified = false;
  let timer = 0;
  const ac = new AbortController();

  const check = async () => {
    if (stopped || notified || document.hidden) return;
    try {
      const live = await deployedBundle(ac.signal);
      if (!live || live === mine || stopped || notified) return;
      notified = true;
      onUpdate(() => window.location.reload());
    } catch {
      /* réseau coupé / serveur en cours de redémarrage : on réessaiera */
    }
  };

  timer = window.setInterval(check, POLL_MS);
  // Un retour au premier plan est le meilleur moment pour découvrir un déploiement.
  const onVisible = () => { if (!document.hidden) void check(); };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    ac.abort();
  };
}
