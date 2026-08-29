const WINDOW_SECONDS = 3600;
const MAX_SUBMISSIONS = 5;

async function hash(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function checkGuestbookRateLimit(db, request) {
  const identity = request.headers.get('cf-connecting-ip') || request.headers.get('x-session-id') || 'anonymous';
  const key = await hash(identity);
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(`
    INSERT INTO rate_limits (key_hash, window_started_at, request_count) VALUES (?, ?, 1)
    ON CONFLICT(key_hash) DO UPDATE SET
      request_count = CASE WHEN ? - window_started_at >= ? THEN 1 ELSE request_count + 1 END,
      window_started_at = CASE WHEN ? - window_started_at >= ? THEN ? ELSE window_started_at END
    RETURNING request_count
  `).bind(key, now, now, WINDOW_SECONDS, now, WINDOW_SECONDS, now).first();
  return Number(result?.request_count || 1) <= MAX_SUBMISSIONS;
}

export async function createGuestbookEntry(db, nickname, content) {
  const result = await db.prepare(
    "INSERT INTO guestbook (nickname, content, status) VALUES (?, ?, 'pending') RETURNING id, status, created_at"
  ).bind(nickname, content).first();
  return result;
}
