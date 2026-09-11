// Inline button payloads. Telegram caps callback_data at 64 bytes.
// ':' is the only delimiter and never appears inside a field.

export const MEDIA_CHAR = { movie: 'm', tv: 't' }
export const MEDIA_TYPE = { m: 'movie', t: 'tv' }

const ACTIONS = {
  w: 'watch',
  l: 'watchlist',
  r: 'rate',
  u: 'undo',
  p: 'page',
  s: 'season',
  e: 'episode',
  i: 'info',
  x: 'noop'
}

export const NOOP = 'x'

export function parseCallback(data) {
  const parts = String(data || '').split(':')
  const action = ACTIONS[parts[0]]
  if (!action) return null
  return { action, args: parts.slice(1) }
}

export function asId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function asIndex(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

export const watchData = (item) => `w:${MEDIA_CHAR[item.media_type]}:${item.id}`
export const pageData = (searchId, index) => `p:${searchId}:${index}`
