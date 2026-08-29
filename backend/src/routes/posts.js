import { ok } from '../utils/response.js';
import { clampInt, text } from '../utils/validation.js';
import { listPosts } from '../services/postService.js';

export async function postsRoute(request, env, headers) {
  const params = new URL(request.url).searchParams;
  const query = {
    page: clampInt(params.get('page'), 1, 1, 10000),
    limit: clampInt(params.get('limit'), 20, 1, 50),
    category: params.has('category') ? text(params.get('category'), 1, 50) : null,
    search: params.has('search') ? text(params.get('search'), 1, 100) : null
  };
  return ok(await listPosts(env.DB, query), 200, headers);
}
