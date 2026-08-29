export async function listStatus(db) {
  const result = await db.prepare(
    'SELECT id, type, label, content, priority, updated_at FROM status WHERE is_active = 1 ORDER BY priority DESC, updated_at DESC'
  ).all();
  return result.results || [];
}
