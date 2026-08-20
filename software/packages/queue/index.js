import { EventEmitter } from 'node:events';
import http from 'node:http';

export class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
    this.jobCounter = 0;
  }

  createJob({ type, payload, totalSteps = 1 }) {
    const jobId = `job-${Date.now()}-${++this.jobCounter}`;
    const job = {
      id: jobId,
      type,
      payload,
      status: 'PENDING',
      progress: 0,
      step: 0,
      totalSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    };
    this.jobs.set(jobId, job);
    this.emit('jobCreated', job);
    this.emit('statusChange', job);
    return job;
  }

  updateJobProgress(jobId, { progress, step, status, result, error }) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (progress !== undefined) job.progress = progress;
    if (step !== undefined) job.step = step;
    if (status !== undefined) job.status = status;
    if (result !== undefined) job.result = result;
    if (error !== undefined) job.error = error;
    
    job.updatedAt = new Date().toISOString();

    this.jobs.set(jobId, job);
    this.emit('jobUpdated', job);
    this.emit('statusChange', job);
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  listJobs({ status } = {}) {
    const allJobs = Array.from(this.jobs.values());
    if (status) {
      return allJobs.filter(job => job.status === status);
    }
    return allJobs;
  }

  static formatSSE(event, data) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }
}

/**
 * Creates an HTTP REST + SSE gateway for the in-memory JobQueue.
 * @param {object} options
 * @param {number} [options.port=8540]
 * @param {string} [options.host='0.0.0.0']
 * @param {JobQueue} [options.queue]
 * @returns {http.Server}
 */
export function createQueueServer({ port = 8540, host = '0.0.0.0', queue = null } = {}) {
  const jobQueue = queue || new JobQueue();
  const sseClients = new Set();

  const broadcast = (event, data) => {
    const frame = JobQueue.formatSSE(event, data);
    for (const client of sseClients) {
      client.write(frame);
    }
  };

  jobQueue.on('jobCreated', (job) => broadcast('jobCreated', job));
  jobQueue.on('jobUpdated', (job) => broadcast('jobUpdated', job));
  jobQueue.on('statusChange', (job) => broadcast('statusChange', job));

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
        service: 'queue-v1',
        jobsCount: jobQueue.jobs.size,
        sseClients: sseClients.size,
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === 'GET' && pathname === '/api/jobs/events') {
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

    if (req.method === 'GET' && pathname === '/api/jobs') {
      const status = url.searchParams.get('status') || undefined;
      return sendJson(200, {
        status: 'ok',
        jobs: jobQueue.listJobs({ status }),
      });
    }

    if (req.method === 'POST' && pathname === '/api/jobs') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const job = jobQueue.createJob({
            type: parsed.type,
            payload: parsed.payload,
            totalSteps: parsed.totalSteps,
          });
          return sendJson(201, { status: 'ok', job });
        } catch (err) {
          return sendJson(400, { error: err.message });
        }
      });
      return;
    }

    const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (jobMatch) {
      const jobId = decodeURIComponent(jobMatch[1]);

      if (req.method === 'GET') {
        const job = jobQueue.getJob(jobId);
        if (!job) return sendJson(404, { error: `Job "${jobId}" not found.` });
        return sendJson(200, { status: 'ok', job });
      }

      if (req.method === 'PATCH' || req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const job = jobQueue.updateJobProgress(jobId, parsed);
            return sendJson(200, { status: 'ok', job });
          } catch (err) {
            const statusCode = err.message.includes('not found') ? 404 : 400;
            return sendJson(statusCode, { error: err.message });
          }
        });
        return;
      }
    }

    sendJson(404, { error: 'Not Found' });
  });

  server.listen(port, host);
  server.jobQueue = jobQueue;
  return server;
}
