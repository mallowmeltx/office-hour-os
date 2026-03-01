# Office Hours OS

Hackathon-friendly web app to make virtual office hours frictionless:
- discover upcoming office-hour events
- follow professors and tags
- see "live now" status and join external meeting links
- discuss in threaded room discussions
- export each event discussion as `.txt`

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

## Notification behavior

- Students receive in-app notifications for:
  - new events created by followed professors or followed tags
  - live sessions started by followed professors or followed tags
