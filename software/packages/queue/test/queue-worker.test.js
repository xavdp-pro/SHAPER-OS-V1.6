import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JobQueue } from '../index.js';
import { startQueueAgentWorker } from '../worker.js';

describe('queue-worker agent.inject', () => {
  it('dispatches payload.message to bridge and completes', async () => {
    const queue = new JobQueue();
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, runId: 'run-test-1', conversation: 'c1', model: 'opencode/nemotron-3.5-lightning-free' }),
      };
    };
    const worker = startQueueAgentWorker({
      queue,
      bridgeUrl: 'http://127.0.0.1:4340',
      pollMs: 50,
      fetchImpl,
    });
    const job = queue.createJob({
      type: 'agent.inject',
      payload: { message: 'Reply PONG', conversation: 'vol-1' },
      totalSteps: 2,
    });
    await new Promise((r) => setTimeout(r, 120));
    const done = queue.getJob(job.id);
    assert.equal(done.status, 'COMPLETED');
    assert.equal(done.result.run_id, 'run-test-1');
    assert.equal(calls[0].body.message, 'Reply PONG');
    worker.stop();
  });

  it('fails when message missing', async () => {
    const queue = new JobQueue();
    const worker = startQueueAgentWorker({
      queue,
      pollMs: 40,
      fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true }) }),
    });
    const job = queue.createJob({ type: 'agent.inject', payload: {} });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(queue.getJob(job.id).status, 'FAILED');
    worker.stop();
  });
});
