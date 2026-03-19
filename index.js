import { Hono } from 'hono'
import { OK, parseCommand, tg } from './src/lib/telegram.js'
import { handleStart } from './src/commands/start.js'
import { handleSearch } from './src/commands/search.js'
import { handleWatched } from './src/commands/watched.js'
import { handleWatch } from './src/callbacks/watch.js'
import { handleNext } from './src/callbacks/next.js'

const app = new Hono()

app.post('/webhook', async (c) => {
  const body = await c.req.json()
  const env = c.env

  if (body.message) {
    const chatId = body.message.chat.id
    const text = (body.message.text || '').trim()
    const telegramId = String(body.message.from.id)

    if (!text) return OK()

    const { command, args } = parseCommand(text)

    if (command === 'start' || command === 'help') return handleStart(env, chatId)
    if (command === 'search') return handleSearch(env, chatId, args)
    if (command === 'watched') return handleWatched(env, chatId, telegramId)

    if (command) {
      await tg(env.BOT_TOKEN, 'sendMessage', {
        chat_id: chatId, text: 'Unknown command. Try /help', parse_mode: 'HTML'
      })
      return OK()
    }

    return OK()
  }

  if (body.callback_query) {
    const cb = body.callback_query
    const cbData = cb.data || ''
    const chatId = cb.message.chat.id
    const telegramId = String(cb.from.id)

    if (cbData.startsWith('watch_')) return handleWatch(env, cb, chatId, telegramId)
    if (cbData.startsWith('next_')) return handleNext(env, cb, chatId)

    if (cbData === 'noop') {
      await tg(env.BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id })
      return OK()
    }

    return OK()
  }

  return OK()
})

export default app
