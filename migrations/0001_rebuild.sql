-- Rebuilds the schema for ratings, a watchlist, rewatches and tv progress.
-- Migrated rows get user_id 0, meaning "logged before the bot tracked who".
-- Watches whose item_id is NULL are dropped; the callback bug that produced
-- them left no way to recover which title they referred to.

PRAGMA defer_foreign_keys = TRUE;

ALTER TABLE items RENAME TO items_old;
ALTER TABLE watch_events RENAME TO watch_events_old;

CREATE TABLE items (
  id          INTEGER PRIMARY KEY,
  media_type  TEXT NOT NULL,
  title       TEXT NOT NULL,
  year        INTEGER,
  poster_path TEXT,
  runtime     INTEGER,
  genres      TEXT,
  overview    TEXT,
  cached_at   TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE watches (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL DEFAULT 0,
  item_id    INTEGER NOT NULL REFERENCES items(id),
  watched_on TEXT NOT NULL,
  rating     INTEGER,
  note       TEXT,
  season     INTEGER,
  episode    INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_watches_user_date ON watches(user_id, watched_on DESC);
CREATE INDEX idx_watches_item ON watches(item_id);

CREATE TABLE watchlist (
  user_id  INTEGER NOT NULL,
  item_id  INTEGER NOT NULL REFERENCES items(id),
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE tracking (
  user_id      INTEGER NOT NULL,
  item_id      INTEGER NOT NULL REFERENCES items(id),
  last_season  INTEGER,
  last_episode INTEGER,
  notify       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE searches (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  query      TEXT NOT NULL,
  results    TEXT NOT NULL,
  cursor     INTEGER NOT NULL DEFAULT 0,
  message_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_searches_created ON searches(created_at);

INSERT INTO items (id, media_type, title, poster_path)
SELECT id, COALESCE(type, 'movie'), title, poster_path
FROM items_old
WHERE title IS NOT NULL;

INSERT INTO watches (id, user_id, item_id, watched_on, created_at)
SELECT id, 0, item_id, date(COALESCE(watched_at, CURRENT_TIMESTAMP)), watched_at
FROM watch_events_old
WHERE item_id IS NOT NULL
  AND item_id IN (SELECT id FROM items);

DROP TABLE watch_events_old;
DROP TABLE items_old;
