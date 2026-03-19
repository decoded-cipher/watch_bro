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
  const env = { ...c.env, db: drizzle(c.env.DB), KV: c.env.KV }

  if (body.message) {
    const chatId = body.message.chat.id
    const text = (body.message.text || '').trim()

    if (!text) return OK()

    const { command, args } = parseCommand(text)

    if (command === 'start' || command === 'help') return handleStart(env, chatId)
    if (command === 'watched') return handleWatched(env, chatId)
    if (command) return OK()

    return handleSearch(env, chatId, text)
  }

  if (body.callback_query) {
    const cb = body.callback_query
    const cbData = cb.data || ''
    const chatId = cb.message.chat.id

    if (cbData.startsWith('watch_')) return handleWatch(env, cb, chatId)
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
