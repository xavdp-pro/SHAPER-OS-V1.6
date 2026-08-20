import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = Number(process.env.GED_PORT || process.env.PORT || 8660);
export const DATA_DIR = process.env.GED_DATA_DIR || path.join(__dirname, '../../data/ged');
export const PUBLIC_DIR = path.join(__dirname, 'public');

fs.mkdirSync(DATA_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
};

export function classifyCategory(ext) {
  const e = String(ext || '').toLowerCase();
  if (['.pdf'].includes(e)) return 'pdf';
  if (['.xlsx', '.xls', '.csv', '.tsv', '.parquet'].includes(e)) return 'spreadsheet';
  if (['.docx', '.doc', '.odt', '.txt', '.md', '.rtf'].includes(e)) return 'document';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(e)) return 'image';
  if (['.zip', '.tar.gz', '.tgz', '.7z', '.rar'].includes(e)) return 'archive';
  return 'other';
}

export const META_FILE = path.join(DATA_DIR, '.meta.json');

export function getMetadata() {
  try {
    if (fs.existsSync(META_FILE)) {
      return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    }
  } catch { /* skip */ }
  return {};
}

export function saveMetadata(meta) {
  try {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  } catch (err) {
    console.error('[ged-meta] Erreur sauvegarde .meta.json:', err.message);
  }
}

export function setFileMeta(relPath, fileMeta) {
  const meta = getMetadata();
  meta[relPath] = {
    ...(meta[relPath] || {}),
    ...fileMeta,
    updatedAt: Date.now(),
  };
  saveMetadata(meta);
}

export function deleteFileMeta(relPath) {
  const meta = getMetadata();
  if (meta[relPath]) {
    delete meta[relPath];
    saveMetadata(meta);
  }
}

export function deleteFilesByConversation(conversationId) {
  if (!conversationId) return [];
  const meta = getMetadata();
  const deleted = [];
  for (const [relPath, info] of Object.entries(meta)) {
    if (info.conversationId === conversationId) {
      const fullPath = path.join(DATA_DIR, relPath.replace(/\.\./g, ''));
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          fs.unlinkSync(fullPath);
        }
        deleted.push(relPath);
        delete meta[relPath];
      } catch (err) {
        console.error(`[ged-meta] Erreur suppression ${relPath}:`, err.message);
      }
    }
  }
  if (deleted.length > 0) saveMetadata(meta);
  return deleted;
}

export function listGedFolders(dir = DATA_DIR) {
  if (!fs.existsSync(dir)) return [];
  const folders = [];
  const walk = (d, rel = '') => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        const curRel = rel ? `${rel}/${entry.name}` : entry.name;
        folders.push(curRel);
        walk(path.join(d, entry.name), curRel);
      }
    }
  };
  walk(dir);
  return folders.sort();
}

export function listGedFiles(dir = DATA_DIR) {
  if (!fs.existsSync(dir)) return [];
  const meta = getMetadata();
  const out = [];
  const walk = (d, rel = '') => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(d, entry.name);
      const curRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(abs, curRel);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(abs);
          const ext = path.extname(entry.name).toLowerCase();
          const fileMeta = meta[curRel] || {};
          out.push({
            id: Buffer.from(curRel).toString('base64url'),
            name: entry.name,
            relPath: curRel,
            folder: rel || '',
            size: stat.size,
            mtime: Math.floor(stat.mtimeMs),
            ext,
            mime: MIME[ext] || 'application/octet-stream',
            category: classifyCategory(ext),
            conversationId: fileMeta.conversationId || '',
            conversationName: fileMeta.conversationName || '',
            tag: fileMeta.tag || '',
            color: fileMeta.color || '',
            emblem: fileMeta.emblem || '',
            importedAt: fileMeta.importedAt || Math.floor(stat.mtimeMs),
          });
        } catch { /* skip */ }
      }
    }
  };
  walk(dir);
  return out.sort((a, b) => b.mtime - a.mtime);
}

export function handleRequest(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = parsed.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health
  if (pathname === '/health' || pathname === '/api/health') {
    const files = listGedFiles();
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ged-v1',
      filesCount: files.length,
      storageBytes: totalBytes,
      dataDir: DATA_DIR,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // List files
  if (req.method === 'GET' && (pathname === '/api/files' || pathname === '/files')) {
    const category = parsed.searchParams.get('category');
    const folder = parsed.searchParams.get('folder');
    const tag = parsed.searchParams.get('tag');
    const q = (parsed.searchParams.get('q') || '').toLowerCase().trim();
    let files = listGedFiles();
    if (category && category !== 'all') {
      files = files.filter(f => f.category === category);
    }
    if (folder !== null && folder !== undefined && folder !== 'all') {
      files = files.filter(f => f.folder === folder);
    }
    if (tag && tag !== 'all') {
      files = files.filter(f => f.tag === tag || f.color === tag);
    }
    if (q) {
      files = files.filter(f => f.name.toLowerCase().includes(q) || f.relPath.toLowerCase().includes(q));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, files, count: files.length }));
    return;
  }

  // List & create folders
  if (pathname === '/api/folders' || pathname === '/folders') {
    if (req.method === 'GET') {
      const folders = listGedFolders();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, folders }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const folderName = String(data.folder || '').trim().replace(/\.\./g, '');
          if (!folderName) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Nom de dossier requis' }));
            return;
          }
          const targetDir = path.join(DATA_DIR, folderName);
          fs.mkdirSync(targetDir, { recursive: true });
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, folder: folderName, folders: listGedFolders() }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }
  }

  // Move file between folders (Drag & Drop)
  if (req.method === 'POST' && (pathname === '/api/move' || pathname === '/move')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const fromRel = String(data.from || '').trim().replace(/\.\./g, '');
        const toFolder = String(data.toFolder || '').trim().replace(/\.\./g, '');
        const fileName = path.basename(fromRel);
        const fromFull = path.join(DATA_DIR, fromRel);
        const toDir = toFolder ? path.join(DATA_DIR, toFolder) : DATA_DIR;
        fs.mkdirSync(toDir, { recursive: true });
        const toRel = toFolder ? `${toFolder}/${fileName}` : fileName;
        const toFull = path.join(toDir, fileName);

        if (!fs.existsSync(fromFull)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Fichier source introuvable' }));
          return;
        }

        fs.renameSync(fromFull, toFull);
        const meta = getMetadata();
        if (meta[fromRel]) {
          meta[toRel] = meta[fromRel];
          delete meta[fromRel];
          saveMetadata(meta);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, from: fromRel, to: toRel, folder: toFolder }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Set file tags & colors (GNOME / Thunar style)
  if (req.method === 'POST' && (pathname === '/api/tag' || pathname === '/tag')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const relPath = String(data.relPath || '').trim().replace(/\.\./g, '');
        if (!relPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'relPath requis' }));
          return;
        }
        setFileMeta(relPath, {
          tag: data.tag || '',
          color: data.color || '',
          emblem: data.emblem || '',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, relPath, tag: data.tag, color: data.color, emblem: data.emblem }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Delete by conversation (Cascade purge)
  const matchDelConv = pathname.match(/^(?:\/api)?\/by-conversation\/(.+)$/);
  if ((req.method === 'DELETE' || req.method === 'POST') && (matchDelConv || pathname.endsWith('/delete-by-conversation'))) {
    const convId = matchDelConv ? decodeURIComponent(matchDelConv[1]) : (parsed.searchParams.get('conversationId') || '');
    const deleted = deleteFilesByConversation(convId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, conversationId: convId, deletedCount: deleted.length, deleted }));
    return;
  }

  // Direct upload
  if (req.method === 'POST' && (pathname === '/api/upload' || pathname === '/upload')) {
    const filename = decodeURIComponent(parsed.searchParams.get('filename') || req.headers['x-filename'] || `file_${Date.now()}`);
    const folder = parsed.searchParams.get('folder') || '';
    const conversationId = parsed.searchParams.get('conversationId') || req.headers['x-conversation-id'] || '';
    const conversationName = decodeURIComponent(parsed.searchParams.get('conversationName') || req.headers['x-conversation-name'] || '');
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetDir = folder ? path.join(DATA_DIR, folder.replace(/\.\./g, '')) : DATA_DIR;
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, safeName);
    const curRel = folder ? `${folder}/${safeName}` : safeName;

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const stat = fs.statSync(targetPath);
      const ext = path.extname(safeName).toLowerCase();
      if (conversationId || conversationName) {
        setFileMeta(curRel, {
          conversationId,
          conversationName: conversationName || conversationId,
          importedAt: Math.floor(stat.mtimeMs),
        });
      }
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        file: {
          name: safeName,
          relPath: curRel,
          size: stat.size,
          category: classifyCategory(ext),
          conversationId,
          conversationName,
        },
      }));
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }

  // Download / Preview
  const matchFile = pathname.match(/^(?:\/api)?\/files\/([^/]+)\/(download|preview)$/);
  if (req.method === 'GET' && matchFile) {
    const fileId = matchFile[1];
    const action = matchFile[2];
    let relPath;
    try {
      relPath = Buffer.from(fileId, 'base64url').toString('utf8');
    } catch {
      relPath = decodeURIComponent(fileId);
    }
    const safePath = path.join(DATA_DIR, relPath.replace(/\.\./g, ''));
    if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Fichier introuvable' }));
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const disposition = action === 'download'
      ? `attachment; filename="${encodeURIComponent(path.basename(safePath))}"`
      : 'inline';

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Disposition': disposition,
      'Content-Length': fs.statSync(safePath).size,
    });
    fs.createReadStream(safePath).pipe(res);
    return;
  }

  // Delete single file
  const matchDelete = pathname.match(/^(?:\/api)?\/files\/([^/]+)$/);
  if (req.method === 'DELETE' && matchDelete) {
    const fileId = matchDelete[1];
    let relPath;
    try {
      relPath = Buffer.from(fileId, 'base64url').toString('utf8');
    } catch {
      relPath = decodeURIComponent(fileId);
    }
    const safePath = path.join(DATA_DIR, relPath.replace(/\.\./g, ''));
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      fs.unlinkSync(safePath);
      deleteFileMeta(relPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, deleted: relPath }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Fichier introuvable' }));
    }
    return;
  }

  // Serve static UI in public/
  let staticPath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(staticPath) || !fs.statSync(staticPath).isFile()) {
    staticPath = path.join(PUBLIC_DIR, 'index.html');
  }

  if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    const ext = path.extname(staticPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/html; charset=utf-8' });
    fs.createReadStream(staticPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

export function createGedServer(port = PORT) {
  const server = http.createServer(handleRequest);
  server.listen(port, '0.0.0.0', () => {
    console.log(`[ged-v1] Mini-GED active sur http://0.0.0.0:${port} (data: ${DATA_DIR})`);
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createGedServer(PORT);
}
