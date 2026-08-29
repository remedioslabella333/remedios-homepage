export async function listFriends(db) {
  const result = await db.prepare(
    'SELECT id, name, description, url, avatar_url, tag, sort_order FROM friends WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC'
  ).all();
  return result.results || [];
}
