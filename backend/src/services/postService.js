function parseTags(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string') : [];
  } catch { return []; }
}

export async function listPosts(db, { page, limit, category, search }) {
  const clauses = ['is_visible = 1', 'published_at IS NOT NULL'];
  const values = [];
  if (category) { clauses.push('category = ?'); values.push(category); }
  if (search) {
    clauses.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')");
    const escaped = search.replace(/[\\%_]/g, '\\$&');
    values.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
  }
  const where = clauses.join(' AND ');
  const count = await db.prepare(`SELECT COUNT(*) AS total FROM posts WHERE ${where}`).bind(...values).first();
  const offset = (page - 1) * limit;
  const result = await db.prepare(
    `SELECT id, slug, title, description, category, tags, cover_url, link, published_at FROM posts WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`
  ).bind(...values, limit, offset).all();
  return {
    items: (result.results || []).map(post => ({ ...post, tags: parseTags(post.tags) })),
    pagination: { page, limit, total: Number(count?.total || 0), pages: Math.ceil(Number(count?.total || 0) / limit) }
  };
}
