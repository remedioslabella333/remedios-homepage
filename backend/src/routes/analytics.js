import { fail, ok } from '../utils/response.js';
import { jsonBody, text } from '../utils/validation.js';
import { EVENT_NAMES, recordEvent } from '../services/analyticsService.js';

export async function analyticsRoute(request, env, headers) {
  const body = await jsonBody(request);
  if (!body || !EVENT_NAMES.has(body.event_name)) {
    return fail('INVALID_EVENT', 'unsupported event', 400, headers);
  }
  const event = {
    event_name: body.event_name,
    session_id: body.session_id ? text(body.session_id, 1, 100) : null,
    page: body.page ? text(body.page, 1, 100) : null,
    metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}
  };
  await recordEvent(env.DB, event);
  return ok({ recorded: true }, 201, headers);
}
