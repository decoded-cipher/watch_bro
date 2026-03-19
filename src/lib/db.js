export async function getUser(DB, telegramId) {
  let user = await DB.prepare(
    'SELECT * FROM users WHERE telegram_id = ?'
  ).bind(telegramId).first()

  if (!user) {
    await DB.prepare(
      'INSERT INTO users (telegram_id) VALUES (?)'
    ).bind(telegramId).run()
    user = await DB.prepare(
      'SELECT * FROM users WHERE telegram_id = ?'
    ).bind(telegramId).first()
  }

  return user
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
