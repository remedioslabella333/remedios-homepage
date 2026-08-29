const MAX_JSON_BYTES = 32 * 1024;

export function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function finiteInt(value, min, max) {
  if (typeof value === 'boolean' || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function text(value, min, max) {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result.length >= min && result.length <= max ? result : null;
}

export function optionalText(value, max) {
  if (value === null || value === undefined || value === '') return null;
  return text(value, 0, max);
}

export function safeUrl(value, { optional = true } = {}) {
  if (value === null || value === undefined || value === '') return optional ? null : null;
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isoDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export function tags(value) {
  if (value === null || value === undefined || value === '') return null;
  if (!Array.isArray(value) || value.length > 20) return null;
  const result = value.map(item => text(item, 1, 40));
  return result.every(Boolean) ? JSON.stringify(result) : null;
}

export async function jsonBody(request) {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';
  if (!contentType.includes('application/json')) return null;
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_JSON_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) return null;
  try {
    const body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}
