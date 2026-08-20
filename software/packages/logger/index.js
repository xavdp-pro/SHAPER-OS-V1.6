/**
 * @module @shaper/logger
 * Append-only structured JSONL audit logger and HTTP ingest gateway.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { EventEmitter } from 'node:events';

export { ingestLog } from './ingest-client.js';

export class EventLogger {
  /**
   * @param {Object} options
   * @param {string} options.pod - Nom unique du conteneur/pod (ex: mail-v1-contact)
   * @param {string} options.logDir - Répertoire où écrire activity.jsonl
   * @param {string} [options.filename='activity.jsonl'] - Nom du fichier de log
   */
  constructor({ pod, logDir, filename = 'activity.jsonl' }) {
    if (!pod) throw new Error('EventLogger requires a pod identifier');
    if (!logDir) throw new Error('EventLogger requires a log directory path');

    this.pod = pod;
    this.logDir = logDir;
    this.filePath = path.join(logDir, filename);

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Crée un ID d'exécution court et unique.
   * @returns {string} (ex: run-a1b2c3)
   */
  static generateExecutionId() {
    return `run-${crypto.randomBytes(3).toString('hex')}`;
  }

  /**
   * Écrit un événement structuré dans activity.jsonl.
   *
   * @param {Object} entry
   * @param {string} [entry.executionId] - ID de la passe d'exécution
   * @param {'INFO'|'WARN'|'ERROR'|'DEBUG'} [entry.level='INFO'] - Niveau de sévérité
   * @param {string} entry.event - Nom de l'événement en SCREAMING_SNAKE_CASE (ex: MAIL_RECEIVED)
   * @param {Record<string, any>} [entry.data={}] - Métadonnées de l'événement
   * @param {number} [entry.durationMs=0] - Durée d'exécution en millisecondes
   * @returns {Object} - L'objet événement complet enregistré
   */
  log({ executionId = null, level = 'INFO', event, data = {}, durationMs = 0 }) {
    if (!event) throw new Error('EventLogger: event name is required');

    const entryObj = {
      timestamp: new Date().toISOString(),
      pod: this.pod,
      execution_id: executionId || EventLogger.generateExecutionId(),
      level: level.toUpperCase(),
      event: String(event).toUpperCase(),
      data: data || {},
      duration_ms: Math.round(durationMs * 10) / 10,
    };

    const line = JSON.stringify(entryObj) + '\n';
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    fs.appendFileSync(this.filePath, line, 'utf8');

    return entryObj;
  }

  /**
   * Lit les N derniers événements du fichier JSONL.
   * @param {number} [limit=50]
   * @returns {Object[]}
   */
  readLastEvents(limit = 50) {
    if (!fs.existsSync(this.filePath)) return [];

    const content = fs.readFileSync(this.filePath, 'utf8').trim();
    if (!content) return [];

    const lines = content.split('\n');
    const slice = lines.slice(Math.max(0, lines.length - limit));

    return slice.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
}

/**
 * Centralized multi-pod JSONL log collector.
 */
export class LogCollector {
  /**
   * @param {object} options
   * @param {string} options.logDir - Root directory for per-pod log folders
   */
  constructor({ logDir }) {
    if (!logDir) throw new Error('LogCollector requires a log directory path');
    this.logDir = logDir;
    this.loggers = new Map();
    this.emitter = new EventEmitter();

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * @param {string} pod
   * @returns {EventLogger}
   */
  getLogger(pod) {
    const normalizedPod = pod || 'unknown';
    if (!this.loggers.has(normalizedPod)) {
      const podDir = path.join(this.logDir, normalizedPod);
      this.loggers.set(normalizedPod, new EventLogger({ pod: normalizedPod, logDir: podDir }));
    }
    return this.loggers.get(normalizedPod);
  }

  /**
   * Ingest a structured log entry and broadcast to SSE subscribers.
   * @param {object} entry
   * @returns {object}
   */
  ingest(entry) {
    if (!entry || !entry.event) {
      throw new Error('Ingest entry requires an event field');
    }

    const pod = entry.pod || 'unknown';
    const record = this.getLogger(pod).log({
      executionId: entry.execution_id || entry.executionId || null,
      level: entry.level || 'INFO',
      event: entry.event,
      data: entry.data || {},
      durationMs: entry.duration_ms ?? entry.durationMs ?? 0,
    });

    this.emitter.emit('event', record);
    return record;
  }

  /**
   * @param {string} [pod]
   * @param {number} [limit=50]
   * @returns {object[]}
   */
  readLastEvents(pod = null, limit = 50) {
    if (pod) {
      return this.getLogger(pod).readLastEvents(limit);
    }

    const pods = this.listPods();
    const allEvents = [];
    for (const podName of pods) {
      allEvents.push(...this.getLogger(podName).readLastEvents(limit));
    }
    return allEvents
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))
      .slice(-limit);
  }

  /**
   * @returns {string[]}
   */
  listPods() {
    if (!fs.existsSync(this.logDir)) return [];

    return fs.readdirSync(this.logDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }
}

/**
 * Creates an HTTP REST + SSE gateway for centralized JSONL log collection.
 * @param {object} options
 * @param {number} [options.port=8520]
 * @param {string} [options.host='0.0.0.0']
 * @param {string} [options.logDir='/data/logger']
 * @param {LogCollector} [options.collector]
 * @returns {http.Server}
 */
export function createLoggerServer({
  port = 8520,
  host = '0.0.0.0',
  logDir = '/data/logger',
  collector = null,
} = {}) {
  const logCollector = collector || new LogCollector({ logDir });
  const sseClients = new Set();

  logCollector.emitter.on('event', (record) => {
    const frame = `event: log\ndata: ${JSON.stringify(record)}\n\n`;
    for (const client of sseClients) {
      client.write(frame);
    }
  });

  const server = http.createServer((req, res) => {
    const sendJson = (statusCode, data) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && (pathname === '/api/health' || pathname === '/health')) {
      return sendJson(200, {
        status: 'ok',
        service: 'logger-v1',
        podsCount: logCollector.listPods().length,
        logDir: logCollector.logDir,
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === 'GET' && pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      sseClients.add(res);

      const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/events/last') {
      const pod = url.searchParams.get('pod') || null;
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      return sendJson(200, {
        status: 'ok',
        events: logCollector.readLastEvents(pod, limit),
      });
    }

    if (req.method === 'GET' && pathname === '/api/pods') {
      return sendJson(200, {
        status: 'ok',
        pods: logCollector.listPods(),
      });
    }

    if (req.method === 'POST' && pathname === '/api/ingest') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (Array.isArray(parsed)) {
            const records = parsed.map((entry) => logCollector.ingest(entry));
            return sendJson(200, { status: 'ok', processed: records.length, records });
          }
          const record = logCollector.ingest(parsed);
          return sendJson(200, { status: 'ok', record });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      });
      return;
    }

    sendJson(404, { error: 'Not Found' });
  });

  server.listen(port, host);
  return server;
}
