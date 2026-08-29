import { fail, ok } from '../utils/response.js';
import { jsonBody, text, clampInt } from '../utils/validation.js';

const resources = {
  status: {
    table: 'status',
    create: ['type', 'label', 'content', 'priority', 'is_active'],
    update: ['type', 'label', 'content', 'priority', 'is_active']
  },
  comments: {
    table: 'comments',
    create: ['nickname', 'content', 'avatar_url', 'source', 'is_visible', 'weight'],
    update: ['nickname', 'content', 'avatar_url', 'source', 'is_visible', 'weight']
  },
  friends: {
    table: 'friends',
    create: ['name', 'description', 'url', 'avatar_url', 'tag', 'sort_order', 'is_active'],
    update: ['name', 'description', 'url', 'avatar_url', 'tag', 'sort_order', 'is_active']
  },
  posts: {
    table: 'posts',
    create: ['slug', 'title', 'description', 'category', 'tags', 'cover_url', 'link', 'published_at', 'is_visible'],
    update: ['slug', 'title', 'description', 'category', 'tags', 'cover_url', 'link', 'published_at', 'is_visible']
  }
};

function normalizedValue(field, value) {
  if (field === 'tags' && Array.isArray(value)) return JSON.stringify(value.filter(item => typeof item === 'string'));
  if (['priority', 'weight', 'sort_order', 'is_active', 'is_visible'].includes(field)) return Number(value);
  return value;
}

function validateBody(resource, body, isCreate) {
  if (!body || typeof body !== 'object') return null;
  const fields = resources[resource][isCreate ? 'create' : 'update'].filter(field => body[field] !== undefined);
  if (!fields.length) return null;
  const required = {
    status: ['type', 'label', 'content'], comments: ['nickname', 'content'],
    friends: ['name', 'url'], posts: ['slug', 'title']
  }[resource];
  if (isCreate && required.some(field => !text(body[field], 1, field === 'content' ? 500 : 200))) return null;
  if (body.url !== undefined) {
    try { new URL(body.url); } catch { return null; }
  }
  if (body.weight !== undefined && (Number(body.weight) < 1 || Number(body.weight) > 100)) return null;
  for (const field of ['is_active', 'is_visible']) {
    if (body[field] !== undefined && ![0, 1, false, true].includes(body[field])) return null;
  }
  return fields;
}

async function createResource(resource, body, env, headers) {
  const fields = validateBody(resource, body, true);
  if (!fields) return fail('INVALID_INPUT', 'invalid input', 400, headers);
  const placeholders = fields.map(() => '?').join(', ');
  const result = await env.DB.prepare(
    `INSERT INTO ${resources[resource].table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...fields.map(field => normalizedValue(field, body[field]))).first();
  return ok(result, 201, headers);
}

async function updateResource(resource, id, body, env, headers) {
  const fields = validateBody(resource, body, false);
  if (!fields) return fail('INVALID_INPUT', 'invalid input', 400, headers);
  const result = await env.DB.prepare(
    `UPDATE ${resources[resource].table} SET ${fields.map(field => `${field} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`
  ).bind(...fields.map(field => normalizedValue(field, body[field])), id).first();
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
  const id = segments[1] ? clampInt(segments[1], 0, 1, Number.MAX_SAFE_INTEGER) : null;
  if (resource === 'guestbook') return guestbookAdmin(request, id, env, headers);
  if (!resources[resource]) return fail('NOT_FOUND', 'not found', 404, headers);
  if (request.method === 'POST' && !id) return createResource(resource, await jsonBody(request), env, headers);
  if (request.method === 'PUT' && id) return updateResource(resource, id, await jsonBody(request), env, headers);
  if (request.method === 'DELETE' && id && resource !== 'posts') return deleteResource(resource, id, env, headers);
  return fail('METHOD_NOT_ALLOWED', 'method not allowed', 405, headers);
}
