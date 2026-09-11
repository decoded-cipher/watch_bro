const DEFAULT_TZ = 'Asia/Kolkata'

// 'YYYY-MM-DD' in the user's timezone, not UTC. A watch logged at 2am
// belongs to the night before, not to the next UTC day.
export const today = (tz = DEFAULT_TZ) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())

const yearOf = (item) => {
  const y = (item.release_date || item.first_air_date || '').slice(0, 4)
  return y ? Number(y) : null
}

export async function insertItem(env, item) {
  await env.DB.prepare(`
    INSERT INTO items (id, media_type, title, year, poster_path, overview)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title       = excluded.title,
      year        = COALESCE(excluded.year, items.year),
      poster_path = excluded.poster_path,
      overview    = COALESCE(excluded.overview, items.overview),
      cached_at   = CURRENT_TIMESTAMP
  `).bind(
    item.id,
    item.media_type,
    item.title || item.name,
    yearOf(item),
    item.poster_path ?? null,
    item.overview ?? null
  ).run()
}

export async function recentWatches(env, limit = 10) {
  const { results } = await env.DB.prepare(`
    SELECT i.title, i.media_type, i.year, w.watched_on, w.rating
    FROM watches w
    JOIN items i ON i.id = w.item_id
    ORDER BY w.watched_on DESC, w.created_at DESC
    LIMIT ?
  `).bind(limit).all()
  return results
}

export async function hasWatched(env, itemId) {
  const row = await env.DB.prepare(`
    SELECT id FROM watches WHERE item_id = ? LIMIT 1
  `).bind(itemId).first()
  return Boolean(row)
}

export async function insertWatch(env, { id, userId, itemId, watchedOn }) {
  await env.DB.prepare(`
    INSERT INTO watches (id, user_id, item_id, watched_on) VALUES (?, ?, ?, ?)
  `).bind(id, userId, itemId, watchedOn).run()
}

export async function createSearch(env, { id, userId, query, results }) {
  await env.DB.prepare(`
    INSERT INTO searches (id, user_id, query, results) VALUES (?, ?, ?, ?)
  `).bind(id, userId, query, JSON.stringify(results)).run()
}

export async function getSearch(env, id) {
  const row = await env.DB.prepare(`
    SELECT id, query, results, cursor, message_id FROM searches WHERE id = ?
  `).bind(id).first()
  return row ? { ...row, results: JSON.parse(row.results) } : null
}

export async function updateSearch(env, id, { cursor, messageId }) {
  await env.DB.prepare(`
    UPDATE searches SET cursor = ?, message_id = COALESCE(?, message_id) WHERE id = ?
  `).bind(cursor, messageId ?? null, id).run()
}

export async function pruneSearches(env) {
  await env.DB.prepare(`
    DELETE FROM searches WHERE created_at < datetime('now', '-1 day')
  `).run()
}
