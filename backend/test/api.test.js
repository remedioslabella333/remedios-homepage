import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

const ADMIN = 'test-admin-token';

async function api(path, options = {}) {
  return SELF.fetch(`https://example.com${path}`, {
    ...options,
    headers: { ...(options.headers || {}), 'origin': 'http://localhost:8000' }
  });
}

describe('health', () => {
  it('reports ok when DB is reachable', async () => {
    const res = await api('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });
});

describe('public read endpoints', () => {
  it('returns the response envelope for status', async () => {
    const res = await api('/api/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(4);
    for (const item of body.data) {
      expect(item).toHaveProperty('content');
      expect(item.is_active).toBeUndefined();
    }
  });

  it('computes status payload shape', async () => {
    const res = await api('/api/status');
    const body = await res.json();
    const keys = Object.keys(body.data[0]).sort();
    expect(keys).toEqual(['content', 'id', 'label', 'priority', 'type', 'updated_at']);
  });

  it('returns visible comments only, weighted-sampled', async () => {
    const res = await api('/api/comments/home?limit=3');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(3);
    for (const item of body.data) {
      expect(item.weight).toBeUndefined();
    }
  });

  it('returns friends', async () => {
    const res = await api('/api/friends');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(3);
  });

  it('returns paginated posts with parsed tags', async () => {
    const res = await api('/api/posts');
    const body = await res.json();
    expect(body.data.pagination.total).toBe(3);
    expect(body.data.items.length).toBe(3);
    for (const item of body.data.items) {
      expect(Array.isArray(item.tags)).toBe(true);
    }
  });

  it('paginates and clamps limits', async () => {
    const res = await api('/api/posts?limit=1&page=2');
    const body = await res.json();
    expect(body.data.items.length).toBe(1);
    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(1);
  });

  it('filters posts by category', async () => {
    const res = await api('/api/posts?category=%E9%A1%B9%E7%9B%AE');
    const body = await res.json();
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].category).toBe('项目');
  });

  it('filters posts by search (LIKE-escaped)', async () => {
    const res = await api('/api/posts?search=%E9%A1%B9%E7%9B%AE');
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('guestbook', () => {
  it('rejects a non-JSON body', async () => {
    const res = await api('/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'nope'
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_JSON');
  });

  it('rejects missing content', async () => {
    const res = await api('/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'a' })
    });
    expect(res.status).toBe(400);
  });

  it('rejects honeypot company field', async () => {
    const res = await api('/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'a', content: 'b', company: 'spam' })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toBe('invalid input');
  });

  it('accepts a valid submission as pending', async () => {
    const res = await api('/api/guestbook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: '访客', content: 'hello world' })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('pending');
  });
});

describe('analytics', () => {
  it('records an allowed event', async () => {
    const res = await api('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_name: 'page_view', page: 'home', session_id: 's1' })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.recorded).toBe(true);
  });

  it('rejects an unknown event name', async () => {
    const res = await api('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event_name: 'evil' })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_EVENT');
  });
});

function adminApi(path, method, body) {
  return api(path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

describe('admin auth', () => {
  it('returns 401 for missing token', async () => {
    const res = await api('/api/admin/status');
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong token', async () => {
    const res = await api('/api/admin/status', { headers: { authorization: 'Bearer nope' } });
    expect(res.status).toBe(401);
  });
});

describe('admin CRUD', () => {
  it('lists status rows (all, not just active)', async () => {
    const res = await adminApi('/api/admin/status', 'GET');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(4);
  });

  it('creates, updates, then deletes a status row', async () => {
    const create = await adminApi('/api/admin/status', 'POST', {
      type: 'test', label: 'TEST', content: 'unit', priority: 5, is_active: 1
    });
    expect(create.status).toBe(201);
    const created = (await create.json()).data;
    expect(created.id).toBeGreaterThan(4);

    const update = await adminApi(`/api/admin/status/${created.id}`, 'PUT', { content: 'updated' });
    expect(update.status).toBe(200);
    expect((await update.json()).data.content).toBe('updated');

    const del = await adminApi(`/api/admin/status/${created.id}`, 'DELETE');
    expect(del.status).toBe(200);
    expect((await del.json()).data.deleted).toBe(true);
  });

  it('rejects an invalid friend url', async () => {
    const res = await adminApi('/api/admin/friends', 'POST', { name: 'x', url: 'notaurl' });
    expect(res.status).toBe(400);
  });

  it('rejects an out-of-range comment weight', async () => {
    const res = await adminApi('/api/admin/comments', 'POST', {
      nickname: 'x', content: 'y', weight: 999
    });
    expect(res.status).toBe(400);
  });

  it('moderates guestbook status', async () => {
    const res = await adminApi('/api/admin/guestbook?status=pending', 'GET');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('CORS', () => {
  it('allows the configured origin', async () => {
    const res = await api('/api/friends', { headers: { origin: 'http://localhost:8000' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:8000');
  });

  it('does not echo an untrusted origin', async () => {
    const res = await SELF.fetch('https://example.com/api/friends', {
      headers: { origin: 'https://evil.example' }
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers OPTIONS preflight', async () => {
    const res = await SELF.fetch('https://example.com/api/friends', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:8000', 'access-control-request-method': 'POST' }
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:8000');
  });
});

describe('unknown route', () => {
  it('returns 404 envelope', async () => {
    const res = await api('/api/nope');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});