import { ok } from '../utils/response.js';
import { listStatus } from '../services/statusService.js';

export async function statusRoute(env, headers) {
  return ok(await listStatus(env.DB), 200, headers);
}
