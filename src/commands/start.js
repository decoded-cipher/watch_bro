import { tg, OK } from '../lib/telegram.js'

const HELP_TEXT =
  '🎬 <b>Movie Tracker Bot</b>\n\n' +
  '/search &lt;movie&gt; — Find movies &amp; TV shows\n' +
  '/watched — See your watch history\n\n' +
  'Tap 👁 to log it, or ➡️ to skip!'

export async function handleStart(env, chatId) {
  await tg(env.BOT_TOKEN, 'sendMessage', {
    chat_id: chatId, text: HELP_TEXT, parse_mode: 'HTML'
  })
  return OK()
}
