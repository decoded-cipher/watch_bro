import { Hono } from 'hono'

const app = new Hono()

async function sendMessage(token, chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...extra
    })
  })
}

async function getUser(DB, telegramId) {
  let user = await DB.prepare(
    `SELECT * FROM users WHERE telegram_id = ?`
  ).bind(telegramId).first()

  if (!user) {
    const res = await DB.prepare(
      `INSERT INTO users (telegram_id) VALUES (?)`
    ).bind(telegramId).run()

    user = { id: res.meta.last_row_id }
  }

  return user
}

async function searchTMDB(apiKey, query) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`
  )
  const data = await res.json()
  return data.results.slice(0, 5)
}

app.post('/webhook', async (c) => {
  const body = await c.req.json()
  const { BOT_TOKEN, TMDB_API_KEY, DB } = c.env

  if (body.message) {
    const msg = body.message
    const chatId = msg.chat.id
    const text = msg.text || ''
    const telegramId = String(msg.from.id)

    const user = await getUser(DB, telegramId)

    if (text === '/start') {
      await sendMessage(BOT_TOKEN, chatId,
        `🎬 Movie Tracker Bot\n\n/search <movie>\nTap 👁 to log watching`
      )
    }

    else if (text.startsWith('/search')) {
      const query = text.replace('/search', '').trim()
      if (!query) {
        return sendMessage(BOT_TOKEN, chatId, 'Give a movie name 😅')
      }

      const results = await searchTMDB(TMDB_API_KEY, query)

      for (const item of results) {
        const title = item.title || item.name
        const id = item.id

        await DB.prepare(`
          INSERT OR IGNORE INTO items (id, title, type, poster_path)
          VALUES (?, ?, ?, ?)
        `).bind(id, title, item.media_type, item.poster_path).run()

        await sendMessage(BOT_TOKEN, chatId, title, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👁 Watched', callback_data: `watch_${id}` }
              ]
            ]
          }
        })
      }
    }

    else if (text === '/watched') {
      const rows = await DB.prepare(`
        SELECT items.title, watch_events.watched_at
        FROM watch_events
        JOIN items ON items.id = watch_events.item_id
        WHERE watch_events.user_id = ?
        ORDER BY watch_events.watched_at DESC
        LIMIT 5
      `).bind(user.id).all()

      if (rows.results.length === 0) {
        return sendMessage(BOT_TOKEN, chatId, 'Nothing watched yet 👀')
      }

      let msgText = '📅 Recent Watches:\n\n'
      for (const r of rows.results) {
        msgText += `• ${r.title}\n`
      }

      await sendMessage(BOT_TOKEN, chatId, msgText)
    }
  }

  if (body.callback_query) {
    const cb = body.callback_query
    const data = cb.data
    const chatId = cb.message.chat.id
    const telegramId = String(cb.from.id)

    const user = await getUser(DB, telegramId)

    if (data.startsWith('watch_')) {
      const itemId = data.split('_')[1]

      await DB.prepare(`
        INSERT INTO watch_events (user_id, item_id)
        VALUES (?, ?)
      `).bind(user.id, itemId).run()

      await sendMessage(
        BOT_TOKEN,
        chatId,
        '✅ Logged as watched'
      )
    }
  }

  return c.text('ok')
})

export default app