import { tg, OK } from '../lib/telegram.js'
import { searchTMDB, fetchFullDetails, buildDetailedCaption, TMDB_IMG } from '../lib/tmdb.js'
import { generateId } from '../lib/db.js'

function buildResultKeyboard(sessionId, itemId, index, total) {
  const buttons = [
    [{ text: '👁 Watched', callback_data: `watch_${sessionId}_${itemId}` }]
  ]
  if (index < total - 1) {
    buttons.push([{ text: 'Not this one ➡️', callback_data: `next_${sessionId}` }])
  }
  return { reply_markup: { inline_keyboard: buttons } }
}

export async function showResult(env, chatId, session, index) {
  const { BOT_TOKEN, TMDB_API_KEY, DB } = env
  const results = JSON.parse(session.results)
  const item = results[index]

  await DB.prepare(
    'INSERT OR IGNORE INTO items (id, title, type, poster_path) VALUES (?, ?, ?, ?)'
  ).bind(item.id, item.title || item.name, item.media_type, item.poster_path).run()

  const details = await fetchFullDetails(TMDB_API_KEY, item)
  const caption = buildDetailedCaption(item, details, index, results.length)
  const keyboard = buildResultKeyboard(session.id, item.id, index, results.length)

  if (session.message_id) {
    if (item.poster_path) {
      await tg(BOT_TOKEN, 'editMessageMedia', {
        chat_id: chatId,
        message_id: session.message_id,
        media: {
          type: 'photo',
          media: `${TMDB_IMG}${item.poster_path}`,
          caption,
          parse_mode: 'HTML'
        },
        ...keyboard
      })
    } else {
      await tg(BOT_TOKEN, 'editMessageText', {
        chat_id: chatId,
        message_id: session.message_id,
        text: caption,
        parse_mode: 'HTML',
        ...keyboard
      })
    }

    await DB.prepare(
      'UPDATE search_sessions SET current_index = ? WHERE id = ?'
    ).bind(index, session.id).run()
  } else {
    let sentMsg
    if (item.poster_path) {
      sentMsg = await tg(BOT_TOKEN, 'sendPhoto', {
        chat_id: chatId,
        photo: `${TMDB_IMG}${item.poster_path}`,
        caption,
        parse_mode: 'HTML',
        ...keyboard
      })
    } else {
      sentMsg = await tg(BOT_TOKEN, 'sendMessage', {
        chat_id: chatId,
        text: caption,
        parse_mode: 'HTML',
        ...keyboard
      })
    }

    const messageId = sentMsg.result?.message_id
    await DB.prepare(
      'UPDATE search_sessions SET current_index = ?, message_id = ? WHERE id = ?'
    ).bind(index, messageId, session.id).run()
    session.message_id = messageId
  }
}

export async function handleSearch(env, chatId, query) {
  const { BOT_TOKEN, TMDB_API_KEY, DB } = env

  if (!query) {
    await tg(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId, text: 'Give a movie name 😅', parse_mode: 'HTML'
    })
    return OK()
  }

  const results = await searchTMDB(TMDB_API_KEY, query)

  if (!results.length) {
    await tg(BOT_TOKEN, 'sendMessage', {
      chat_id: chatId,
      text: `No results found for "<b>${query}</b>" 🤷`,
      parse_mode: 'HTML'
    })
    return OK()
  }

  const sessionId = generateId()
  await DB.prepare(
    'INSERT INTO search_sessions (id, chat_id, results, current_index) VALUES (?, ?, ?, 0)'
  ).bind(sessionId, chatId, JSON.stringify(results)).run()

  const session = { id: sessionId, results: JSON.stringify(results), message_id: null }
  await showResult(env, chatId, session, 0)
  return OK()
}
