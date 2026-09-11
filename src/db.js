export async function insertItem(env, item) {
  await env.DB.prepare(`
    INSERT INTO items (id, title, type, poster_path)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).bind(item.id, item.title || item.name, item.media_type, item.poster_path ?? null).run()
}

export async function recentWatches(env, limit = 10) {
  const { results } = await env.DB.prepare(`
    SELECT i.title, i.type, w.watched_at
    FROM watch_events w
    JOIN items i ON i.id = w.item_id
    ORDER BY w.watched_at DESC
    LIMIT ?
  `).bind(limit).all()
  return results
}

export async function hasWatched(env, itemId) {
  const row = await env.DB.prepare(`
    SELECT id FROM watch_events WHERE item_id = ? LIMIT 1
  `).bind(itemId).first()
  return Boolean(row)
}

export async function insertWatch(env, id, itemId) {
  await env.DB.prepare(`
    INSERT INTO watch_events (id, item_id) VALUES (?, ?)
  `).bind(id, itemId).run()
}
