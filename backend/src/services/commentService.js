function weightedSample(items, limit) {
  const pool = items.map(item => ({ ...item }));
  const selected = [];
  while (pool.length && selected.length < limit) {
    const total = pool.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
    let target = Math.random() * total;
    let index = 0;
    for (; index < pool.length - 1; index += 1) {
      target -= Math.max(1, pool[index].weight);
      if (target <= 0) break;
    }
    const [item] = pool.splice(index, 1);
    delete item.weight;
    selected.push(item);
  }
  return selected;
}

export async function listHomeComments(db, limit) {
  const result = await db.prepare(
    'SELECT id, nickname, content, avatar_url, weight FROM comments WHERE is_visible = 1 ORDER BY created_at DESC LIMIT 100'
  ).all();
  return weightedSample(result.results || [], limit);
}
