/**
 * Optional queue consumer: dispatches PENDING jobs of type `agent.inject` to a bridge.
 * Enabled with QUEUE_AUTO_DISPATCH=1.
 *
 * Job params (POST /api/jobs):
 * {
 *   "type": "agent.inject",
 *   "payload": {
 *     "message": "What to do (required)",
 *     "conversation": "optional-slug",
 *     "bridgeUrl": "http://127.0.0.1:4340",
 *     "model": "opencode/deepseek-v4-flash-free",
 *     "context": "optional instructions"
 *   },
 *   "totalSteps": 2
 * }
 */
export function startQueueAgentWorker({
  queue,
  bridgeUrl = process.env.QUEUE_BRIDGE_URL || 'http://127.0.0.1:4340',
  bridgeToken = process.env.QUEUE_BRIDGE_TOKEN || process.env.BRIDGE_AUTH_TOKEN || '',
  pollMs = Number(process.env.QUEUE_POLL_MS || 2000),
  fetchImpl = fetch,
} = {}) {
  if (!queue) throw new Error('queue is required');
  let stopped = false;
  let busy = false;

  function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (bridgeToken) h.Authorization = `Bearer ${bridgeToken}`;
    return h;
  }

  async function processOne(job) {
    const payload = job.payload || {};
    const message = String(payload.message || '').trim();
    if (!message) {
      queue.updateJobProgress(job.id, { status: 'FAILED', error: 'payload.message required', progress: 100 });
      return;
    }
    const target = (payload.bridgeUrl || bridgeUrl).replace(/\/$/, '');
    queue.updateJobProgress(job.id, { status: 'RUNNING', progress: 10, step: 1 });

    const res = await fetchImpl(`${target}/api/inject`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        conversation: payload.conversation || `queue-${job.id}`,
        message,
        context: payload.context || null,
        model: payload.model || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok !== true) {
      queue.updateJobProgress(job.id, {
        status: 'FAILED',
        error: data.error || `inject HTTP ${res.status}`,
        progress: 100,
        step: 2,
      });
      return;
    }
    queue.updateJobProgress(job.id, {
      status: 'COMPLETED',
      progress: 100,
      step: 2,
      result: {
        run_id: data.runId || data.run_id || data.id || null,
        conversation: data.conversation || null,
        model: data.model || null,
        bridge: target,
      },
    });
  }

  async function tick() {
    if (stopped || busy) return;
    busy = true;
    try {
      const pending = queue.listJobs({ status: 'PENDING' })
        .filter((j) => j.type === 'agent.inject')
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      if (pending[0]) await processOne(pending[0]);
    } catch (err) {
      console.error('[queue-worker]', err.message);
    } finally {
      busy = false;
    }
  }

  const timer = setInterval(tick, pollMs);
  tick();
  console.log(`[queue-worker] auto-dispatch ON → ${bridgeUrl} (poll ${pollMs}ms)`);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}
