# Office Hours OS

Hackathon-friendly web app to make virtual office hours frictionless:
- discover upcoming office-hour events
- follow professors and tags
- see "live now" status and join external meeting links
- discuss in threaded room discussions
- export each event discussion as `.txt`
- summarize discussions with Gemini

## Tech stack

- Next.js App Router + TypeScript + Tailwind
- Auth0 (passwordless/magic-link flow)
- Prisma + PostgreSQL

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill values:

```bash
cp .env.example .env
```

- Add `GEMINI_API_KEY` in `.env` to enable AI summaries.

3. Configure Auth0 app:
- Add callback URL: `http://localhost:3000/auth/callback`
- Add logout URL: `http://localhost:3000`
- Enable Passwordless Email

4. Run Prisma migrations:

```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Start dev server:

```bash
npm run dev
```

## Key routes

- `/` - landing + live now
- `/calendar` - browse events and create events (professors)
- `/live` - live session manager + live list
- `/events/:id` - event room + discussion + export
- `/events/:id` - event room + discussion + export + Gemini summary
- `/professors` - follow professors
- `/tags` - follow tags
- `/notifications` - in-app notifications
- `/profile` - switch role between student/professor for demo

## API highlights

- `POST /api/events` create event
- `POST /api/follows/professors/:id` follow professor
- `POST /api/follows/tags/:id` follow tag
- `POST /api/live` go live
- `POST /api/discussions/:eventId/posts` post thread/reply
- `GET /api/discussions/:eventId/export` download transcript
- `POST /api/discussions/:eventId/summary` generate Gemini summary

## Gemini safety and usage controls

- Summary API is authenticated and server-side only (key never sent to browser).
- Guardrails applied:
  - per-user rate limiting and cooldown
  - transcript size limits (max posts + max chars)
  - request timeout
  - bounded output size
  - one continuation pass if model stops due to max tokens
- You can tune limits with optional `.env` values:
  - `GEMINI_SUMMARY_WINDOW_MS`
  - `GEMINI_SUMMARY_MAX_REQUESTS`
  - `GEMINI_SUMMARY_MIN_INTERVAL_MS`
  - `GEMINI_SUMMARY_MAX_POSTS`
  - `GEMINI_SUMMARY_MAX_TRANSCRIPT_CHARS`
  - `GEMINI_SUMMARY_MAX_OUTPUT_CHARS`
  - `GEMINI_SUMMARY_MAX_OUTPUT_TOKENS`
  - `GEMINI_SUMMARY_TIMEOUT_MS`

## Notification behavior

- Students receive in-app notifications for:
  - new events created by followed professors or followed tags
  - live sessions started by followed professors or followed tags
