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
```

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
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<worker-url>/webhook
```

## Project Structure

```
index.js           — Hono app, webhook routing
src/handlers.js    — command + callback handlers
src/schema.js      — Drizzle table definitions
drizzle/           — SQL migrations
wrangler.toml      — Workers + D1 + KV config
```
