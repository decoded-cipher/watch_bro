import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { items, watchEvents } from './schema.js'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

const HELP_TEXT =
  '🎬 <b>Movie Tracker Bot</b>\n\n' +
  '/search &lt;movie&gt; — Find movies &amp; TV shows\n' +
  '/watched — See your watch history\n\n' +
  'Tap 👁 to log it, or ➡️ to skip!'

// ── Telegram helpers ──

export const OK = () => new Response('ok', { status: 200 })

export async function tg(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

export function parseCommand(text) {
  const match = text.match(/^\/(\w+)(?:@\w+)?\s*(.*)$/)
  if (!match) return { command: null, args: text.trim() }
  return { command: match[1].toLowerCase(), args: match[2].trim() }
}

const generateId = () => nanoid(12)

const SESSION_TTL = 600 // 10 minutes

async function getSession(kv, id) {
  const data = await kv.get(`session:${id}`, 'json')
  return data
}

async function putSession(kv, id, data) {
  await kv.put(`session:${id}`, JSON.stringify(data), { expirationTtl: SESSION_TTL })
}

// ── TMDB helpers ──

async function searchTMDB(apiKey, query) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`
  )
  const data = await res.json()
  const seen = new Set()
  return (data.results || [])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    .slice(0, 5)
}

async function fetchFullDetails(apiKey, item) {
  const res = await fetch(
    `https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=${apiKey}&append_to_response=credits`
  )
  return res.json()
}

function formatRating(vote) {
  if (!vote) return ''
  const stars = Math.round(vote / 2)
  return '★'.repeat(stars) + '☆'.repeat(5 - stars) + ` ${vote.toFixed(1)}/10`
}

function buildCaption(item, details, index, total) {
  const title = item.title || item.name
  const year = (item.release_date || item.first_air_date || '').slice(0, 4)
  const type = item.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'
  const rating = formatRating(item.vote_average)
  const genres = (details.genres || []).map(g => g.name).slice(0, 3).join(', ')
  const cast = (details.credits?.cast || []).slice(0, 3).map(c => c.name).join(', ')
  const director = item.media_type === 'movie'
    ? (details.credits?.crew || []).find(c => c.job === 'Director')?.name : null
  const creator = item.media_type === 'tv'
    ? (details.created_by || []).map(c => c.name).slice(0, 2).join(', ') : null
  const runtime = item.media_type === 'movie' && details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : null
  const seasons = item.media_type === 'tv' && details.number_of_seasons
    ? `${details.number_of_seasons} season${details.number_of_seasons > 1 ? 's' : ''}` : null
  const overview = item.overview
    ? (item.overview.length > 300 ? item.overview.slice(0, 297) + '...' : item.overview) : ''

  let c = `<b>${title}</b>`
  if (year) c += ` (${year})`
  c += `\n${type}`
  if (rating) c += `  •  ${rating}`
  if (genres) c += `\n🏷 ${genres}`
  if (runtime) c += `\n⏱ ${runtime}`
  if (seasons) c += `\n📅 ${seasons}`
  if (director) c += `\n🎬 ${director}`
  if (creator) c += `\n✍️ ${creator}`
  if (cast) c += `\n🌟 ${cast}`
  if (overview) c += `\n\n${overview}`
  c += `\n\n<i>Result ${index + 1} of ${total}</i>`
  return c
}

// ── Search result display ──

async function showResult(env, chatId, session, index) {
  const { BOT_TOKEN, TMDB_API_KEY, KV, db } = env
  const item = session.results[index]

  await db.insert(items).values({
    id: item.id,
    title: item.title || item.name,
    type: item.media_type,
    posterPath: item.poster_path
  }).onConflictDoNothing()

  const details = await fetchFullDetails(TMDB_API_KEY, item)
  const caption = buildCaption(item, details, index, session.results.length)

  const buttons = [
    [{ text: '👁 Watched', callback_data: `watch_${session.id}_${item.id}` }]
  ]
  if (index < session.results.length - 1) {
    buttons.push([{ text: 'Not this one ➡️', callback_data: `next_${session.id}` }])
  }
  const keyboard = { reply_markup: { inline_keyboard: buttons } }

  if (session.messageId) {
    if (item.poster_path) {
      await tg(BOT_TOKEN, 'editMessageMedia', {
        chat_id: chatId, message_id: session.messageId,
        media: { type: 'photo', media: `${TMDB_IMG}${item.poster_path}`, caption, parse_mode: 'HTML' },
        ...keyboard
      })
    } else {
      await tg(BOT_TOKEN, 'editMessageText', {
        chat_id: chatId, message_id: session.messageId,
        text: caption, parse_mode: 'HTML', ...keyboard
      })
    }
    session.currentIndex = index
    await putSession(KV, session.id, session)
  } else {
    const sentMsg = item.poster_path
      ? await tg(BOT_TOKEN, 'sendPhoto', { chat_id: chatId, photo: `${TMDB_IMG}${item.poster_path}`, caption, parse_mode: 'HTML', ...keyboard })
      : await tg(BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML', ...keyboard })

    session.messageId = sentMsg.result?.message_id
    session.currentIndex = index
    await putSession(KV, session.id, session)
  }
}

// ── Command handlers ──

export async function handleStart(env, chatId) {
  await tg(env.BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: HELP_TEXT, parse_mode: 'HTML' })
  return OK()
}

export async function handleSearch(env, chatId, query) {
  const { BOT_TOKEN, TMDB_API_KEY, KV } = env

  if (!query) {
    await tg(BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: 'Give a movie name 😅', parse_mode: 'HTML' })
    return OK()
  }

  const results = await searchTMDB(TMDB_API_KEY, query)
  if (!results.length) {
    await tg(BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: `No results for "<b>${query}</b>" 🤷`, parse_mode: 'HTML' })
    return OK()
  }

  const sessionId = generateId()
  const session = { id: sessionId, chatId, results, currentIndex: 0, messageId: null }
  await putSession(KV, sessionId, session)

  await showResult(env, chatId, session, 0)
  return OK()
}

export async function handleWatched(env, chatId) {
  const { BOT_TOKEN, db } = env

  const rows = await db
    .select({ title: items.title, type: items.type, watchedAt: watchEvents.watchedAt })
    .from(watchEvents)
    .innerJoin(items, eq(items.id, watchEvents.itemId))
    .orderBy(desc(watchEvents.watchedAt))
    .limit(10)

  if (!rows.length) {
    await tg(BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: 'Nothing watched yet 👀', parse_mode: 'HTML' })
    return OK()
  }

  let msg = '📅 <b>Recent Watches</b>\n'
  for (const r of rows) {
    const icon = r.type === 'movie' ? '🎬' : '📺'
    const date = r.watchedAt ? new Date(r.watchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
    msg += `\n${icon} ${r.title}${date ? `  <i>${date}</i>` : ''}`
  }

  await tg(BOT_TOKEN, 'sendMessage', { chat_id: chatId, text: msg, parse_mode: 'HTML' })
  return OK()
}

// ── Callback handlers ──

export async function handleWatch(env, cb, chatId) {
  const { BOT_TOKEN, KV, db } = env
  const parts = cb.data.split('_')
  const sessionId = parts[1]
  const itemId = Number(parts[2])

  const [existing] = await db
    .select({ id: watchEvents.id }).from(watchEvents)
    .where(eq(watchEvents.itemId, itemId))

  if (existing) {
    await tg(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id, text: 'Already in your watch list ✅' })
    return OK()
  }

  await db.insert(watchEvents).values({ id: generateId(), itemId })

  const [item] = await db.select({ title: items.title }).from(items).where(eq(items.id, itemId))
  await tg(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id, text: `✅ Logged "${item?.title || 'movie'}" as watched!` })

  const session = await getSession(KV, sessionId)
  if (session) {
    const buttons = [[{ text: '✅ Watched!', callback_data: 'noop' }]]
    if (session.currentIndex < session.results.length - 1) {
      buttons.push([{ text: 'Not this one ➡️', callback_data: `next_${sessionId}` }])
    }
    await tg(BOT_TOKEN, 'editMessageReplyMarkup', { chat_id: chatId, message_id: session.messageId, reply_markup: { inline_keyboard: buttons } })
  }

  return OK()
}

export async function handleNext(env, cb, chatId) {
  const { BOT_TOKEN, KV } = env
  const sessionId = cb.data.split('_')[1]

  const session = await getSession(KV, sessionId)

  if (!session) {
    await tg(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id, text: 'Session expired, search again' })
    return OK()
  }

  const nextIndex = session.currentIndex + 1

  if (nextIndex >= session.results.length) {
    await tg(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id, text: 'No more results' })
    return OK()
  }

  await tg(BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id })
  await showResult(env, chatId, session, nextIndex)
  return OK()
}
