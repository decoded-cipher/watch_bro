import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const items = sqliteTable('items', {
  id: integer('id').primaryKey(),
  title: text('title'),
  type: text('type'),
  posterPath: text('poster_path')
})

export const watchEvents = sqliteTable('watch_events', {
  id: text('id').primaryKey(),
  itemId: integer('item_id').references(() => items.id),
  watchedAt: text('watched_at').default(sql`CURRENT_TIMESTAMP`)
})
