import { tg, OK } from '../lib/telegram.js'
import { getUser } from '../lib/db.js'

export async function handleWatched(env, chatId, telegramId) {
  const { BOT_TOKEN, DB } = env
  const user = await getUser(DB, telegramId)

  const rows = await DB.prepare(`
    SELECT items.title, items.type, watch_events.watched_at
    FROM watch_events
    JOIN items ON items.id = watch_events.item_id
    WHERE watch_events.user_id = ?
    ORDER BY watch_events.watched_at DESC
    LIMIT 10
  `).bind(user.id).all()

  if (rows.results.length === 0) {
    await tg(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId, text: 'Nothing watched yet 👀', parse_mode: 'HTML'
    })
    return OK()
  }

  let msgText = '📅 <b>Recent Watches</b>\n'
  for (const r of rows.results) {
    const icon = r.type === 'movie' ? '🎬' : '📺'
    const date = r.watched_at
      ? new Date(r.watched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : ''
    msgText += `\n${icon} ${r.title}${date ? `  <i>${date}</i>` : ''}`
  }

  await tg(BOT_TOKEN, 'sendMessage', {
    chat_id: chatId, text: msgText, parse_mode: 'HTML'
  })
  return OK()
}
