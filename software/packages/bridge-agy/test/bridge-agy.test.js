import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgyBridgeServer } from '../index.js';

test('bridge-agy - health and metrics contract', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-'));
  const bridge = new AgyBridgeServer({ workspaceBase: tmp, port: 8750, stubMode: true });
  const server = bridge.createServer();
  await new Promise((r) => server.listen(8750, '127.0.0.1', r));

  const health = await (await fetch('http://127.0.0.1:8750/api/health')).json();
  assert.equal(health.ok, true);
  assert.equal(health.service, 'univ-bridge-agy');

  const metrics = await (await fetch('http://127.0.0.1:8750/api/metrics')).json();
  assert.equal(metrics.ok, true);

  await new Promise((r) => server.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('bridge-agy - inject stub mode', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-inj-'));
  const ctx = path.join(tmp, 'AGENT-CONTEXT.md');
  fs.writeFileSync(ctx, '# Univ7\nRole: overnight ops watchdog', 'utf8');

  const bridge = new AgyBridgeServer({ workspaceBase: tmp, port: 8751, stubMode: true });
  const server = bridge.createServer();
  await new Promise((r) => server.listen(8751, '127.0.0.1', r));

  const res = await fetch('http://127.0.0.1:8751/api/inject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation: 'univ7-ops',
      context_file: ctx,
      message: 'Summarize overnight ops status.',
    }),
  });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.conversation, 'univ7-ops');
  assert.equal(data.stub, true);

  await new Promise((r) => server.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
});
