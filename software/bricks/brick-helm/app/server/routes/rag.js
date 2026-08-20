import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { authMiddleware } from './auth.js';
import { QdrantRagEngine } from '../lib/rag/index.js';

const router = Router();
const ragEngine = new QdrantRagEngine({
  qdrantUrl: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
});

// Auto-initialisation des collections au démarrage
ragEngine.init().catch(err => {
  console.warn('[RAG] Qdrant non disponible au démarrage immédiat:', err.message);
});

/**
 * GET /api/rag/status — État du cluster Qdrant et métriques d'indexation
 */
router.get('/rag/status', authMiddleware, async (req, res) => {
  try {
    const stats = await ragEngine.getStats();
    res.json({ ok: true, ...stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/rag/index — Indexer un fichier ou document dans Qdrant
 */
router.post('/rag/index', authMiddleware, async (req, res) => {
  const filePath = String(req.body?.filePath || '').trim();
  const fileId = req.body?.fileId;
  const metadata = req.body?.metadata || {};
  const collection = req.body?.collection || 'documents';

  if (!filePath) {
    return res.status(400).json({ ok: false, error: 'filePath requis' });
  }

  try {
    const result = await ragEngine.indexDocument({
      filePath,
      fileId,
      metadata: {
        ...metadata,
        indexedBy: req.user?.email || 'user',
      },
      collection,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/rag/query — Recherche sémantique par similarité vectorielle
 */
router.post('/rag/query', authMiddleware, async (req, res) => {
  const query = String(req.body?.query || '').trim();
  const limit = Math.min(Number(req.body?.limit || 5), 20);
  const collection = req.body?.collection || 'documents';
  const filter = req.body?.filter || null;

  if (!query) {
    return res.status(400).json({ ok: false, error: 'query requis' });
  }

  try {
    const results = await ragEngine.search(query, {
      limit,
      collection,
      filter,
    });

    res.json({ ok: true, query, count: results.length, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
