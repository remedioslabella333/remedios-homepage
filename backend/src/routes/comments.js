import { ok } from '../utils/response.js';
import { clampInt } from '../utils/validation.js';
import { listHomeComments } from '../services/commentService.js';

export async function commentsRoute(request, env, headers) {
  const limit = clampInt(new URL(request.url).searchParams.get('limit'), 20, 1, 50);
  return ok(await listHomeComments(env.DB, limit), 200, headers);
}
