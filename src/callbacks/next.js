import { tg, OK } from '../lib/telegram.js'
import { showResult } from '../commands/search.js'

export async function handleNext(env, cb, chatId) {
  const { BOT_TOKEN, TMDB_API_KEY, DB } = env
  const sessionId = cb.data.split('_')[1]

  const session = await DB.prepare(
    'SELECT * FROM search_sessions WHERE id = ?'
  ).bind(sessionId).first()

  if (!session) {
    await tg(BOT_TOKEN, 'answerCallbackQuery', {
      callback_query_id: cb.id, text: 'Session expired, search again'
    })
    return OK()
  }

  const results = JSON.parse(session.results)
  const nextIndex = session.current_index + 1

  if (nextIndex >= results.length) {
    await tg(BOT_TOKEN, 'answerCallbackQuery', {
      callback_query_id: cb.id, text: 'No more results'
    })
    return OK()
  }

  await tg(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id })
  await showResult(env, chatId, session, nextIndex)
  return OK()
}
