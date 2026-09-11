import { Hono } from 'hono'
import {
  OK, tg, parseCommand,
  handleStart, handleSearch, handleWatched,
  handleWatch, handlePage
} from './src/handlers.js'
import { parseCallback } from './src/callback.js'

const app = new Hono()

const COMMANDS = [
  { command: 'help', description: 'How to use the bot' },
  { command: 'watched', description: 'Your recent watch history' }
]

const authed = async (c, next) => {
  const secret = c.env.WEBHOOK_SECRET
  if (!secret || c.req.header('x-telegram-bot-api-secret-token') !== secret) {
    return c.text('forbidden', 403)
  }
  await next()
}

async function route(env, body) {
  if (body.message) {
    const chatId = body.message.chat.id
    const text = (body.message.text || '').trim()

    if (!text) return OK()

    const { command } = parseCommand(text)

    if (command === 'start' || command === 'help') return handleStart(env, chatId)
    if (command === 'watched') return handleWatched(env, chatId)
    if (command) return OK()

    return handleSearch(env, chatId, text, body.message.message_id)
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
  }

  return OK()
}

app.post('/setup', authed, async (c) => {
  const { BOT_TOKEN, WEBHOOK_SECRET } = c.env
  const [commands, webhook] = await Promise.all([
    tg(BOT_TOKEN, 'setMyCommands', { commands: COMMANDS }),
    tg(BOT_TOKEN, 'setWebhook', {
      url: `${new URL(c.req.url).origin}/webhook`,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query']
    })
  ])
  return c.json({ commands, webhook })
})

app.post('/webhook', authed, async (c) => {
  try {
    const body = await c.req.json()
    const env = {
      ...c.env,
      waitUntil: (p) => c.executionCtx.waitUntil(p.catch(err => console.error('background', err)))
    }
    return await route(env, body)
  } catch (err) {
    console.error('webhook', err)
    return OK()
  }
})

export default app
