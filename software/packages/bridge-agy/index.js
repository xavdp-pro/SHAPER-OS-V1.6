/**
 * @package @shaper/bridge-agy
 * HTTP/SSE bridge for Antigravity CLI (agy) — Rule 8 agent container contract.
 */
import http from 'node:http';
import { buildAgySpawnEnv, hasAntigravityApiKey } from './agy-env.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function normalizeConversationName(name) {
  if (!name || typeof name !== 'string') return 'default';
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return clean || 'default';
}

export function formatSseEvent(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export class AgyBridgeServer {
  constructor({
    port = 4330,
    bind = '0.0.0.0',
    agyBin = process.env.AGY_BIN || process.env.ANTIGRAVITY_BIN || 'agy',
    defaultModel = process.env.AGY_MODEL || process.env.ANTIGRAVITY_MODEL || 'gemini-3.6-flash-low',
    defaultEffort = 'low',
    workspaceBase = '/tmp/agy-workspaces',
    authToken = '',
    stubMode = process.env.BRIDGE_AGY_STUB === '1',
  } = {}) {
    this.port = port;
    this.bind = bind;
    this.agyBin = agyBin;
    this.defaultModel = defaultModel;
    this.defaultEffort = defaultEffort;
    this.workspaceBase = workspaceBase;
    this.authToken = authToken;
    this.stubMode = stubMode;
    this.clients = new Map();
    this.runningProcesses = new Map();
    this.metrics = { injects: 0, completions: 0, errors: 0 };

    fs.mkdirSync(this.workspaceBase, { recursive: true });
  }

  ensureWorkspace(conversationName) {
    const conv = normalizeConversationName(conversationName);
    const wsPath = path.join(this.workspaceBase, conv);
    fs.mkdirSync(wsPath, { recursive: true });
    return wsPath;
  }

  broadcast(obj, filterConv = null) {
    const line = formatSseEvent(obj);
    for (const [res, clientFilter] of this.clients.entries()) {
      if (filterConv && clientFilter && clientFilter !== filterConv) continue;
      try { res.write(line); } catch { /* closed */ }
    }
  }

  buildContextualPrompt(userPrompt, { contextFile = null, contextText = null } = {}) {
    let finalPrompt = '';
    if (contextFile && fs.existsSync(contextFile)) {
      finalPrompt += `[BUSINESS CONTEXT (${path.basename(contextFile)})]\n${fs.readFileSync(contextFile, 'utf8')}\n\n`;
    }
    if (contextText) finalPrompt += `[INSTRUCTIONS]\n${contextText}\n\n`;
    finalPrompt += `[USER REQUEST]\n${userPrompt}`;
    return finalPrompt;
  }

  runAgentStub(conv, runId, prompt) {
    setTimeout(() => {
      this.broadcast({ type: 'text_delta', conversation: conv, run_id: runId, text: 'STUB: ops summary OK' }, conv);
      this.broadcast({ type: 'done', conversation: conv, run_id: runId, exit_code: 0, stub: true }, conv);
      this.metrics.completions++;
    }, 10);
    return { runId, cwd: this.ensureWorkspace(conv), model: this.defaultModel, effort: this.defaultEffort, stub: true };
  }

  runAgent(conversationName, prompt, opts = {}) {
    const conv = normalizeConversationName(conversationName);
    const cwd = this.ensureWorkspace(conv);
    const runId = `run-agy-${Date.now()}`;
    const fullPrompt = this.buildContextualPrompt(prompt, {
      contextFile: opts.contextFile || null,
      contextText: opts.contextText || null,
    });

    this.broadcast({ type: 'start', conversation: conv, run_id: runId, model: this.defaultModel }, conv);

    if (this.stubMode) {
      return this.runAgentStub(conv, runId, fullPrompt);
    }

    const args = ['--print', '--output-format', 'stream-json', '--dangerously-skip-permissions',
      '--print-timeout', opts.printTimeout || process.env.AGY_PRINT_TIMEOUT || '5m',
      '--model', opts.model || this.defaultModel, '--effort', opts.effort || this.defaultEffort, fullPrompt];

    const proc = spawn(this.agyBin, args, {
      cwd,
      env: buildAgySpawnEnv(process.env, opts.env),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.runningProcesses.set(conv, proc);

    let buffer = '';
    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          this.broadcast({ type: 'agent_event', conversation: conv, run_id: runId, raw: JSON.parse(line) }, conv);
        } catch {
          this.broadcast({ type: 'text_delta', conversation: conv, run_id: runId, text: line }, conv);
        }
      }
    });
    proc.stderr.on('data', (chunk) => {
      this.broadcast({ type: 'log', conversation: conv, run_id: runId, text: chunk.toString('utf8') }, conv);
    });
    proc.on('close', (code) => {
      this.runningProcesses.delete(conv);
      if (code === 0) this.metrics.completions++;
      else this.metrics.errors++;
      this.broadcast({ type: 'done', conversation: conv, run_id: runId, exit_code: code }, conv);
    });

    return { runId, cwd, model: this.defaultModel, effort: this.defaultEffort };
  }

  createServer() {
    return http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const p = url.pathname;

      if (p === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          service: 'univ-bridge-agy',
          port: this.port,
          model: this.defaultModel,
          stubMode: this.stubMode,
          hasApiKey: hasAntigravityApiKey(process.env),
        }));
        return;
      }

      if (p === '/api/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, service: 'univ-bridge-agy', metrics: this.metrics, running: this.runningProcesses.size }));
        return;
      }

      if (this.authToken) {
        const auth = req.headers.authorization || '';
        const token = auth.replace(/^Bearer\s+/i, '').trim();
        if (token !== this.authToken) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
          return;
        }
      }

      if (p === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(formatSseEvent({ type: 'connected' }));
        this.clients.set(res, normalizeConversationName(url.searchParams.get('conversation')) || null);
        req.on('close', () => this.clients.delete(res));
        return;
      }

      if (p === '/api/inject' && req.method === 'POST') {
        let bodyText = '';
        for await (const chunk of req) bodyText += chunk;
        try {
          const body = JSON.parse(bodyText || '{}');
          const conv = normalizeConversationName(body.conversation);
          const message = String(body.message || '').trim();
          if (!message && !body.context_file) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'message or context_file required' }));
            return;
          }
          const result = this.runAgent(conv, message, {
            contextFile: body.context_file || null,
            contextText: body.context || null,
            model: body.model || null,
            effort: body.effort || null,
          });
          this.metrics.injects++;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, conversation: conv, ...result }));
        } catch (err) {
          this.metrics.errors++;
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
    });
  }
}

export function createAgyBridgeServer(opts = {}) {
  const bridge = new AgyBridgeServer(opts);
  const server = bridge.createServer();
  server.listen(opts.port || 4330, opts.bind || '0.0.0.0');
  return { bridge, server };
}
