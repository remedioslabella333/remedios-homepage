import { fail, ok } from '../utils/response.js';
import { jsonBody, text } from '../utils/validation.js';
import { checkGuestbookRateLimit, createGuestbookEntry } from '../services/guestbookService.js';

export async function guestbookRoute(request, env, headers) {
  const body = await jsonBody(request);
  if (!body) return fail('INVALID_JSON', 'request body must be JSON', 400, headers);
  if (body.company) return fail('INVALID_INPUT', 'invalid input', 400, headers);
  const nickname = text(body.nickname, 1, 30);
  const content = text(body.content, 1, 200);
  if (!nickname || !content) return fail('INVALID_INPUT', 'nickname or content is invalid', 400, headers);
  if (!await checkGuestbookRateLimit(env.DB, request)) {
    return fail('RATE_LIMITED', 'too many submissions', 429, headers);
  }
  return ok(await createGuestbookEntry(env.DB, nickname, content), 201, headers);
}
