import { Router } from 'express';
import http from 'node:http';
import { authMiddleware } from './auth.js';
import { discoverAppsFromFilesystem } from '../lib/vibeApps.js';
import { listVibeProjects, getVibeProject } from '../lib/vibeProjects.js';

const router = Router();

/** Dossiers sous /apps (scan disque local). */
router.get('/vibe/apps', authMiddleware, (_req, res) => {
  res.json({ ok: true, root: '/apps', apps: discoverAppsFromFilesystem() });
});

/** Liste des projets vibe-code (panneau droit). */
router.get('/vibe/projects', authMiddleware, (_req, res) => {
  res.json({ ok: true, projects: listVibeProjects() });
});

/** Statut dev server (le port répond ?) — pour l'état de l'onglet Aperçu. */
router.get('/vibe/projects/:id/status', authMiddleware, (req, res) => {
  const project = getVibeProject(req.params.id);
  if (!project) return res.status(404).json({ ok: false, error: 'projet inconnu' });
  const probe = http.request({
    host: project.devHost,
    port: project.devPort,
    path: '/',
    method: 'HEAD',
    timeout: 2500,
  }, (up) => {
    up.resume();
    res.json({ ok: true, up: true, status: up.statusCode, project });
  });
  probe.on('error', () => res.json({ ok: true, up: false, project }));
  probe.on('timeout', () => { probe.destroy(); res.json({ ok: true, up: false, project }); });
  probe.end();
});

/** Retire les en-têtes qui empêchent l'affichage en iframe même origine. */
function stripFramingHeaders(headers) {
  const out = { ...headers };
  delete out['x-frame-options'];
  delete out['X-Frame-Options'];
  if (out['content-security-policy']) {
    // Ne garder que ce qui ne bloque pas l'iframe même origine.
    out['content-security-policy'] = String(out['content-security-policy'])
      .replace(/frame-ancestors[^;]*;?/gi, '');
  }
  return out;
}

/**
 * Reverse-proxy same-origin vers le serveur de dev du projet.
 * Monté sur /api/preview/:id → req.url = sous-chemin côté dev server.
 * Rem. : un dev Vite doit tourner avec base=/api/preview/:id/ pour que le
 * graphe de modules/HMR résolve sous ce préfixe (voir mds/CANVAS-PREVIEW.md).
 */
function proxyHandler(req, res) {
  const project = getVibeProject(req.params.id);
  if (!project) return res.status(404).json({ ok: false, error: 'projet inconnu' });

  // Retire le préfixe /api/preview/<id> pour obtenir le chemin côté dev server.
  const prefix = `/api/preview/${project.id}`;
  const upstreamPath = req.originalUrl.startsWith(prefix)
    ? (req.originalUrl.slice(prefix.length) || '/')
    : (req.url || '/');
  // Pas de compression upstream : on doit pouvoir réécrire le HTML en clair.
  const fwdHeaders = { ...req.headers, host: `${project.devHost}:${project.devPort}` };
  delete fwdHeaders['accept-encoding'];
  // express.json() already consumed the request stream — re-send JSON body
  // or POSTs hang upstream waiting for Content-Length bytes that never arrive.
  const method = String(req.method || 'GET').toUpperCase();
  const contentType = String(req.headers['content-type'] || '');
  const parsedJsonBody = method !== 'GET' && method !== 'HEAD'
    && contentType.includes('application/json')
    && req.body !== undefined;
  let bodyBuf = null;
  if (parsedJsonBody) {
    bodyBuf = Buffer.from(JSON.stringify(req.body ?? null), 'utf8');
    fwdHeaders['content-length'] = String(bodyBuf.length);
    delete fwdHeaders['transfer-encoding'];
  }
  const options = {
    host: project.devHost,
    port: project.devPort,
    method: req.method,
    path: upstreamPath,
    headers: fwdHeaders,
    timeout: 30000,
  };
  const prefixUrl = `/api/preview/${project.id}`;
  const upstream = http.request(options, (up) => {
    const ct = String(up.headers['content-type'] || '');
    // Pour le HTML : réécrire les URLs racine-absolues sous le préfixe preview
    // (best-effort ; fiable à 100 % si le dev/build tourne avec base=préfixe).
    if (ct.includes('text/html')) {
      const chunks = [];
      up.on('data', (c) => chunks.push(c));
      up.on('end', () => {
        let html = Buffer.concat(chunks).toString('utf8');
        // Le document est servi sous le préfixe → le relatif résout seul.
        // On réécrit seulement les URLs racine-absolues (="/… mais pas ="//…).
        html = html.replace(/((?:src|href)=)"\/(?!\/)/g, `$1"${prefixUrl}/`);
        const headers = stripFramingHeaders(up.headers);
        delete headers['content-length'];
        res.writeHead(up.statusCode || 200, headers);
        res.end(html);
      });
      return;
    }
    res.writeHead(up.statusCode || 502, stripFramingHeaders(up.headers));
    up.pipe(res);
  });
  upstream.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({
        ok: false,
        error: `Dev server injoignable (${project.devHost}:${project.devPort})`,
        detail: err.message,
        hint: `Lance le dev avec base=/api/preview/${project.id}/`,
      });
    } else {
      res.end();
    }
  });
  upstream.on('timeout', () => { upstream.destroy(); });
  if (bodyBuf) {
    upstream.end(bodyBuf);
  } else {
    req.pipe(upstream);
  }
  return undefined;
}

// Express 5 (path-to-regexp v8) : wildcard nommé, pas de `*` nu.
router.all('/preview/:id', authMiddleware, proxyHandler);
router.all('/preview/:id/{*rest}', authMiddleware, proxyHandler);

export default router;
