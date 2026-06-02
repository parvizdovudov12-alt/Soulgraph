# Soulgraph

Soulgraph is a goal-driven life tracker. It stores life events, evaluates how they affect your mental, physical, moral, and financial balance, and compares your actions against a saved goal.

## What is fixed

- Goal saving works for both new and existing profiles
- Sessions survive restarts when the app uses PostgreSQL
- User data persists in a cloud Postgres database instead of in local memory
- Database tables are created automatically on first startup

## Local run

1. Copy `.env.example` to `.env` and fill in values if you want persistent storage
2. Run `npm install`
3. Run `npm run dev`

If `DATABASE_URL` is missing, the app still starts, but data is stored only in memory and disappears after restart.

## Recommended free cloud setup

Use these two free services together:

1. Neon for PostgreSQL
2. Vercel for hosting

### Required environment variables

- `DATABASE_URL`: your Neon Postgres connection string
- `SESSION_SECRET`: a long random string for stable login sessions
- `COOKIE_SECURE`: `true` in cloud, `false` locally if needed

## Deploy notes

The app is ready for cloud persistence once `DATABASE_URL` is configured. On first boot it automatically creates the required tables and uses PostgreSQL-backed sessions, so logins and saved goals stop resetting between restarts.
