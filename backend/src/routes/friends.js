import { ok } from '../utils/response.js';
import { listFriends } from '../services/friendService.js';

export async function friendsRoute(env, headers) {
  return ok(await listFriends(env.DB), 200, headers);
}
