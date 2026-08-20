/**
 * HTTP ingest client — all bricks log through @shaper/logger.
 */

/**
 * @param {object} options
 * @param {string} options.loggerUrl - Base URL e.g. http://127.0.0.1:8520
 * @param {string} options.pod
 * @param {string} options.event
 * @param {object} [options.data]
 * @param {string} [options.level]
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function ingestLog({
  loggerUrl,
  pod,
  event,
  data = {},
  level = 'INFO',
  fetchImpl = fetch,
} = {}) {
  if (!loggerUrl || !pod || !event) return null;
  const base = loggerUrl.replace(/\/$/, '');
  const url = base.endsWith('/api/ingest') ? base : `${base}/api/ingest`;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod, event, level, data }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return json.record || null;
  } catch {
    return null;
  }
}
