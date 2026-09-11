# movie-bot

Personal Telegram bot for tracking movies and TV shows. Type a name, tap
watched, done.

## Stack

- **Runtime** — Cloudflare Workers
- **Framework** — Hono
- **Database** — Cloudflare D1, queried directly with prepared statements
- **Data** — TMDB API

One runtime dependency, one binding. The database stores only what cannot
be derived from somewhere else: what you watched.

## Usage

Send any movie or show name as a message. The bot replies with results one
at a time, showing poster, rating, cast and genre.

- **👁 Watched** — logs it to your history
- **Not this one ➡️** — next result
- **/watched** — your recent watches
- **/help** — usage info

Result cards are sent as a reply to your search message. That is load
bearing, not cosmetic: it is how paging works without storing anything.
Telegram hands the original query back on every button press as
`reply_to_message`, so the bot re-runs the search rather than keeping a
session alive.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- A [Telegram bot token](https://core.telegram.org/bots#botfather)
- A [TMDB API key](https://developer.themoviedb.org/)

### 1. Install dependencies

```sh
npm install
```

### 2. Create the database

```sh
wrangler d1 create cipher_movie_bot
```

Put the returned `database_id` in `wrangler.toml`.

### 3. Set secrets

```sh
wrangler secret put BOT_TOKEN
wrangler secret put TMDB_API_KEY
wrangler secret put WEBHOOK_SECRET
```

`WEBHOOK_SECRET` is any string you choose, 1 to 256 characters from
`A-Z a-z 0-9 _ -`. Telegram echoes it on every delivery so the worker can
reject forged updates. **The webhook check fails closed**, so set this
before deploying or the bot will reject everything.

For local development put the same three in `.dev.vars`.

### 4. Run migrations

```sh
npm run db:migrate:local    # local dev
npm run db:migrate:remote   # production
```

### 5. Deploy

```sh
npm run deploy
```

### 6. Run setup

```sh
curl -X POST https://<worker-url>/setup \
  -H "X-Telegram-Bot-Api-Secret-Token: <WEBHOOK_SECRET>"
```

Registers the webhook with a matching `secret_token` and populates the
command menu. The worker uses its own `BOT_TOKEN`, so the token never has
to be pasted into a shell. Re-run it after changing the command list in
`index.js` or rotating `WEBHOOK_SECRET`.

## Project structure

```
index.js           — hono app, auth, routing, error boundary
src/handlers.js    — command and callback handlers
src/callback.js    — inline button payload encoding
src/db.js          — d1 queries
migrations/        — sql migrations
wrangler.toml      — workers and d1 config
```

## Notes

**Callback payloads.** Telegram caps `callback_data` at 64 bytes. Payloads
are colon delimited and generated ids use `[0-9a-z]` only, so a delimiter
can never appear inside a field. See `src/callback.js`.

**Dates.** Watches are stored as a date, not a timestamp, resolved in the
timezone set by the `TIMEZONE` var in `wrangler.toml`. A watch logged at
2am belongs to the night before, not the next UTC day.

**Rewatches.** `watches` has no unique constraint on `item_id`, so the
schema records watching something more than once.

## Licence

MIT
