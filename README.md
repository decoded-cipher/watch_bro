# movie-bot

Personal Telegram bot for tracking movies and TV shows. Type a name, tap watched, done.

## Stack

- **Runtime** — Cloudflare Workers
- **Framework** — Hono
- **Database** — Cloudflare D1 (via Drizzle ORM)
- **Cache** — Cloudflare KV (search sessions, 10 min TTL)
- **Data** — TMDB API

## Usage

Send any movie or show name as a message. The bot returns results one at a time with poster, rating, cast, and genre info.

- **👁 Watched** — logs it to your watch history
- **Not this one ➡️** — skip to the next result
- **/watched** — see your last 10 watches
- **/help** — show usage info

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

### 2. Create Cloudflare resources

```sh
wrangler d1 create cipher_movie_bot
wrangler kv namespace create KV
```

Update `wrangler.toml` with the IDs from above.

### 3. Set secrets

```sh
wrangler secret put BOT_TOKEN
wrangler secret put TMDB_API_KEY
wrangler secret put WEBHOOK_SECRET
```

`WEBHOOK_SECRET` is any string of your choosing, 1 to 256 characters from
`A-Z a-z 0-9 _ -`. Telegram sends it back on every request so the worker can
reject forged updates. Requests without it are rejected with a 403.

### 4. Run migrations

```sh
npm run db:migrate:local   # local dev
npm run db:migrate:remote  # production
```

### 5. Deploy

```sh
npm run deploy
```

### 6. Set webhook

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<worker-url>/webhook&secret_token=<WEBHOOK_SECRET>
```

The `secret_token` must match the `WEBHOOK_SECRET` set above.

### 7. Register the command menu

```sh
curl -X POST https://<worker-url>/setup \
  -H "X-Telegram-Bot-Api-Secret-Token: <WEBHOOK_SECRET>"
```

Populates the menu button next to the message box. Re-run it whenever the
command list in `index.js` changes.

## Project Structure

```
index.js           — Hono app, webhook routing
src/handlers.js    — command + callback handlers
src/callback.js    — inline button payload encoding
src/schema.js      — Drizzle table definitions
drizzle/           — SQL migrations
wrangler.toml      — Workers + D1 + KV config
```
