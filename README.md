# movie-bot

Personal Telegram bot for tracking movies and TV shows. Type a name, tap watched, done.

## Stack

- **Runtime** — Cloudflare Workers
- **Framework** — Hono
- **Database** — Cloudflare D1
- **Cache** — Cloudflare KV (reserved for TMDB response caching)
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

### 6. Run setup

```sh
curl -X POST https://<worker-url>/setup \
  -H "X-Telegram-Bot-Api-Secret-Token: <WEBHOOK_SECRET>"
```

Registers the webhook with a matching `secret_token` and populates the
command menu. The worker uses its own `BOT_TOKEN`, so the token never has
to be handled by hand. Re-run it after changing the command list in
`index.js` or rotating `WEBHOOK_SECRET`.

## Project Structure

```
index.js           — Hono app, webhook routing
src/handlers.js    — command + callback handlers
src/callback.js    — inline button payload encoding
src/db.js          — d1 queries
migrations/        — SQL migrations
wrangler.toml      — Workers + D1 + KV config
```
