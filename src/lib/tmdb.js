const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

export { TMDB_IMG }

export async function searchTMDB(apiKey, query) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}`
  )
  const data = await res.json()

  const seen = new Set()
  return (data.results || [])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    .slice(0, 5)
}

export async function fetchFullDetails(apiKey, item) {
  const res = await fetch(
    `https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=${apiKey}&append_to_response=credits`
  )
  return res.json()
}

export function formatRating(vote) {
  if (!vote) return ''
  const stars = Math.round(vote / 2)
  return '★'.repeat(stars) + '☆'.repeat(5 - stars) + ` ${vote.toFixed(1)}/10`
}

export function buildDetailedCaption(item, details, index, total) {
  const title = item.title || item.name
  const year = (item.release_date || item.first_air_date || '').slice(0, 4)
  const type = item.media_type === 'movie' ? '🎬 Movie' : '📺 TV Show'
  const rating = formatRating(item.vote_average)

  const genres = (details.genres || []).map(g => g.name).slice(0, 3).join(', ')
  const cast = (details.credits?.cast || []).slice(0, 3).map(c => c.name).join(', ')

  const director = item.media_type === 'movie'
    ? (details.credits?.crew || []).find(c => c.job === 'Director')?.name
    : null
  const creator = item.media_type === 'tv'
    ? (details.created_by || []).map(c => c.name).slice(0, 2).join(', ')
    : null

  const runtime = item.media_type === 'movie' && details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : null
  const seasons = item.media_type === 'tv' && details.number_of_seasons
    ? `${details.number_of_seasons} season${details.number_of_seasons > 1 ? 's' : ''}`
    : null

  const overview = item.overview
    ? item.overview.length > 300 ? item.overview.slice(0, 297) + '...' : item.overview
    : ''

  let caption = `<b>${title}</b>`
  if (year) caption += ` (${year})`
  caption += `\n${type}`
  if (rating) caption += `  •  ${rating}`
  if (genres) caption += `\n🏷 ${genres}`
  if (runtime) caption += `\n⏱ ${runtime}`
  if (seasons) caption += `\n📅 ${seasons}`
  if (director) caption += `\n🎬 ${director}`
  if (creator) caption += `\n✍️ ${creator}`
  if (cast) caption += `\n🌟 ${cast}`
  if (overview) caption += `\n\n${overview}`
  caption += `\n\n<i>Result ${index + 1} of ${total}</i>`

  return caption
}
