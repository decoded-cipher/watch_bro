import { tg, OK } from '../lib/telegram.js'
import { getUser } from '../lib/db.js'

export async function handleWatch(env, cb, chatId, telegramId) {
  const { BOT_TOKEN, DB } = env
  const parts = cb.data.split('_')
  const sessionId = parts[1]
  const itemId = parts[2]
  const user = await getUser(DB, telegramId)

  const existing = await DB.prepare(
    'SELECT id FROM watch_events WHERE user_id = ? AND item_id = ?'
  ).bind(user.id, itemId).first()

  if (existing) {
    await tg(BOT_TOKEN, 'answerCallbackQuery', {
      callback_query_id: cb.id, text: 'Already in your watch list ✅'
    })
    return OK()
  }

  await DB.prepare(
    'INSERT INTO watch_events (user_id, item_id) VALUES (?, ?)'
  ).bind(user.id, itemId).run()

  const item = await DB.prepare('SELECT title FROM items WHERE id = ?').bind(itemId).first()
  await tg(BOT_TOKEN, 'answerCallbackQuery', {
    callback_query_id: cb.id, text: `✅ Logged "${item?.title || 'movie'}" as watched!`
  })

  const session = await DB.prepare(
    'SELECT * FROM search_sessions WHERE id = ?'
  ).bind(sessionId).first()

  if (session) {
    const results = JSON.parse(session.results)
    const idx = session.current_index

    const buttons = [[{ text: '✅ Watched!', callback_data: 'noop' }]]
    if (idx < results.length - 1) {
      buttons.push([{ text: 'Not this one ➡️', callback_data: `next_${sessionId}` }])
    }

    await tg(BOT_TOKEN, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: session.message_id,
      reply_markup: { inline_keyboard: buttons }
    })
  }

  return OK()
}
