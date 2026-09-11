import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import {
  OK, tg, parseCommand,
  handleStart, handleSearch, handleWatched,
  handleWatch, handlePage
} from './src/handlers.js'
import { parseCallback } from './src/callback.js'

const app = new Hono()

app.post('/webhook', async (c) => {
  const secret = c.env.WEBHOOK_SECRET
  if (!secret || c.req.header('x-telegram-bot-api-secret-token') !== secret) {
    return c.text('forbidden', 403)
  }

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
    const chatId = cb.message.chat.id
    const parsed = parseCallback(cb.data)

    if (!parsed) return OK()

    if (parsed.action === 'watch') return handleWatch(env, cb, chatId, parsed.args)
    if (parsed.action === 'page') return handlePage(env, cb, chatId, parsed.args)

    if (parsed.action === 'noop') {
      await tg(env.BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id })
      return OK()
    }

    return OK()
  }

  return OK()
})

export default app
