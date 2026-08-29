import { fail, ok } from './utils/response.js';
import { corsHeaders } from './utils/cors.js';
import { isAdmin } from './utils/auth.js';
import { statusRoute } from './routes/status.js';
import { commentsRoute } from './routes/comments.js';
import { friendsRoute } from './routes/friends.js';
import { postsRoute } from './routes/posts.js';
import { guestbookRoute } from './routes/guestbook.js';
import { analyticsRoute } from './routes/analytics.js';
import { adminRoute } from './routes/admin.js';

async function dispatch(request, env, headers) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (path === '/api/health' && request.method === 'GET') {
    await env.DB.prepare('SELECT 1').first();
    return ok({ service: 'remedios-api', status: 'ok' }, 200, headers);
  }
  if (path === '/api/status' && request.method === 'GET') return statusRoute(env, headers);
  if (path === '/api/comments/home' && request.method === 'GET') return commentsRoute(request, env, headers);
  if (path === '/api/friends' && request.method === 'GET') return friendsRoute(env, headers);
  if (path === '/api/posts' && request.method === 'GET') return postsRoute(request, env, headers);
  if (path === '/api/guestbook' && request.method === 'POST') return guestbookRoute(request, env, headers);
  if (path === '/api/events' && request.method === 'POST') return analyticsRoute(request, env, headers);
  if (path.startsWith('/api/admin/')) {
    if (!await isAdmin(request, env)) return fail('UNAUTHORIZED', 'unauthorized', 401, headers);
    return adminRoute(request, env, headers, path.slice('/api/admin/'.length).split('/'));
  }
  return fail('NOT_FOUND', 'not found', 404, headers);
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    try {
      return await dispatch(request, env, headers);
    } catch (error) {
      console.error('request failed', error);
      return fail('INTERNAL_ERROR', 'server error', 500, headers);
    }
  }
};
