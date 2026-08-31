import { fail, ok } from '../utils/response.js';
import { jsonBody, text, optionalText, finiteInt, safeUrl, isoDate, tags, clampInt } from '../utils/validation.js';

const INVALID = Symbol('invalid');

function toggle(value) {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return INVALID;
}

function requiredText(min, max) {
  return value => {
    const result = text(value, min, max);
    return result === null ? INVALID : result;
  };
}

function optionalNullable(max) {
  return value => {
    if (value === null || value === undefined || value === '') return null;
    const result = text(value, 1, max);
    return result === null ? INVALID : result;
  };
}

function optionalUrl(value) {
  if (value === null || value === undefined || value === '') return null;
  return safeUrl(value) ?? INVALID;
}

const resources = {
  status: {
    table: 'status',
    required: ['type', 'label', 'content'],
    fields: {
      type: requiredText(1, 50),
      label: requiredText(1, 50),
      content: requiredText(1, 500),
      priority: value => finiteInt(value, 0, 1000) ?? INVALID,
      is_active: toggle
    }
  },
  comments: {
    table: 'comments',
    required: ['nickname', 'content'],
    fields: {
      nickname: requiredText(1, 50),
      content: requiredText(1, 500),
      avatar_url: optionalUrl,
      source: optionalNullable(100),
      is_visible: toggle,
      weight: value => finiteInt(value, 1, 100) ?? INVALID
    }
  },
  friends: {
    table: 'friends',
    required: ['name', 'url'],
    fields: {
      name: requiredText(1, 100),
      description: optionalNullable(500),
      url: value => safeUrl(value) ?? INVALID,
      avatar_url: optionalUrl,
      tag: optionalNullable(50),
      sort_order: value => finiteInt(value, 0, 1000) ?? INVALID,
      is_active: toggle
    }
  },
  posts: {
    table: 'posts',
    required: ['slug', 'title'],
    fields: {
      slug: requiredText(1, 100),
      title: requiredText(1, 200),
      description: optionalNullable(500),
      category: optionalNullable(50),
      tags: value => tags(value) ?? INVALID,
      cover_url: optionalUrl,
      link: optionalUrl,
      published_at: value => isoDate(value) ?? INVALID,
      is_visible: toggle
    }
  }
};

function normalizeFields(resource, body, isCreate) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const spec = resources[resource];
  const normalized = {};
  for (const [key, value] of Object.entries(body)) {
    if (!(key in spec.fields)) continue;
    const result = spec.fields[key](value);
    if (result === INVALID) return null;
    normalized[key] = result;
  }
  if (isCreate && spec.required.some(field => !(field in normalized))) return null;
  if (!Object.keys(normalized).length) return null;
  return normalized;
}

async function listResource(resource, env, headers) {
  const result = await env.DB.prepare(
    `SELECT * FROM ${resources[resource].table} ORDER BY id ASC LIMIT 200`
  ).all();
  return ok(result.results || [], 200, headers);
}

async function createResource(resource, body, env, headers) {
  const normalized = normalizeFields(resource, body, true);
  if (!normalized) return fail('INVALID_INPUT', 'invalid input', 400, headers);
  const fields = Object.keys(normalized);
  const placeholders = fields.map(() => '?').join(', ');
  const result = await env.DB.prepare(
    `INSERT INTO ${resources[resource].table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...fields.map(field => normalized[field])).first();
  return ok(result, 201, headers);
}

async function updateResource(resource, id, body, env, headers) {
  const normalized = normalizeFields(resource, body, false);
  if (!normalized) return fail('INVALID_INPUT', 'invalid input', 400, headers);
  const fields = Object.keys(normalized);
  const result = await env.DB.prepare(
    `UPDATE ${resources[resource].table} SET ${fields.map(field => `${field} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`
  ).bind(...fields.map(field => normalized[field]), id).first();
  return result ? ok(result, 200, headers) : fail('NOT_FOUND', 'not found', 404, headers);
}

async function deleteResource(resource, id, env, headers) {
  const result = await env.DB.prepare(`DELETE FROM ${resources[resource].table} WHERE id = ? RETURNING id`).bind(id).first();
  return result ? ok({ deleted: true, id }, 200, headers) : fail('NOT_FOUND', 'not found', 404, headers);
}

async function guestbookAdmin(request, id, env, headers) {
  if (request.method === 'GET' && !id) {
    const status = new URL(request.url).searchParams.get('status') || 'pending';
    if (!['pending', 'approved', 'rejected'].includes(status)) return fail('INVALID_INPUT', 'invalid status', 400, headers);
    const result = await env.DB.prepare(
      'SELECT id, nickname, content, status, created_at, updated_at FROM guestbook WHERE status = ? ORDER BY created_at DESC LIMIT 100'
    ).bind(status).all();
    return ok(result.results || [], 200, headers);
  }
  if (request.method === 'PUT' && id) {
    const body = await jsonBody(request);
    if (!body || !['pending', 'approved', 'rejected'].includes(body.status)) return fail('INVALID_INPUT', 'invalid status', 400, headers);
    const result = await env.DB.prepare(
      'UPDATE guestbook SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *'
    ).bind(body.status, id).first();
    return result ? ok(result, 200, headers) : fail('NOT_FOUND', 'not found', 404, headers);
  }
  return fail('METHOD_NOT_ALLOWED', 'method not allowed', 405, headers);
}

export async function adminRoute(request, env, headers, segments) {
  const resource = segments[0];
  const id = segments[1] ? clampInt(segments[1], 1, 1, Number.MAX_SAFE_INTEGER) : null;
  if (resource === 'guestbook') return guestbookAdmin(request, id, env, headers);
  if (!resources[resource]) return fail('NOT_FOUND', 'not found', 404, headers);
  if (request.method === 'GET' && !id) return listResource(resource, env, headers);
  if (request.method === 'POST' && !id) return createResource(resource, await jsonBody(request), env, headers);
  if (request.method === 'PUT' && id) return updateResource(resource, id, await jsonBody(request), env, headers);
  if (request.method === 'DELETE' && id) return deleteResource(resource, id, env, headers);
  return fail('METHOD_NOT_ALLOWED', 'method not allowed', 405, headers);
}