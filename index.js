import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import {
  OK, tg, parseCommand,
  handleStart, handleSearch, handleWatched,
  handleWatch, handleNext
} from './src/handlers.js'

const app = new Hono()

app.post('/webhook', async (c) => {
  const body = await c.req.json()
  const env = { ...c.env, db: drizzle(c.env.DB) }

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
      await tg(env.BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: 'Unknown command. Try /help', parse_mode: 'HTML' })
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
