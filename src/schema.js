import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  telegramId: text('telegram_id').unique().notNull()
})

export const items = sqliteTable('items', {
  id: integer('id').primaryKey(),
  title: text('title'),
  type: text('type'),
  posterPath: text('poster_path')
})

export const watchEvents = sqliteTable('watch_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  itemId: integer('item_id').references(() => items.id),
  watchedAt: text('watched_at').default(sql`CURRENT_TIMESTAMP`)
})

export const searchSessions = sqliteTable('search_sessions', {
  id: text('id').primaryKey(),
  chatId: integer('chat_id'),
  results: text('results'),
  currentIndex: integer('current_index').default(0),
  messageId: integer('message_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
})
