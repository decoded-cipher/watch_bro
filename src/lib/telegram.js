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
