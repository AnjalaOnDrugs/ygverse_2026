# YGverse 2026

Event app for YGverse: attendees log in with their registration number, share photos in a live feed (single photos or multi-photo collections shown as a stack), like and comment on each individual photo, and get quiet push-style in-app notifications when someone likes their photo. Built with **Next.js** (Vercel) and **Convex** (database, photo storage, real-time updates).

The **Games** section handles team groupings with an organizer-scored leaderboard. The **Inspired** section is the red-carpet runway hype meter: while an attendee walks, everyone can tap their heart as many times as they like — every tap counts (taps are batched client-side and stored in sharded counters server-side) and a live "Most inspiring" board ranks the top walkers.

## Develop locally

Two terminals:

```bash
npx convex dev     # backend: watches convex/ and pushes functions
npm run dev        # frontend: http://localhost:3000
```

`npx convex dev` writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local` automatically.

## Seed attendees

Attendee accounts are pre-created from a CSV (`regNo,username,password` with header row — see `scripts/attendees.example.csv`):

```bash
node scripts/seed.mjs scripts/attendees.example.csv          # dev deployment
node scripts/seed.mjs path/to/real-attendees.csv --prod      # production
```

Passwords are salted and hashed server-side (never stored in plain text). Re-running the script updates existing registration numbers instead of duplicating them.

Test accounts seeded in dev: `YG001`/`changeme1` (Haris), `YG002`/`changeme2` (Minji), `YG003`/`changeme3` (Rose).

## How it works

- `convex/schema.ts` — tables: `users`, `sessions`, `posts` (one row per upload action), `images` (one row per photo, 1–10 per post), `likes` / `comments` / `notifications` (all keyed by image, so every photo in a collection has its own likes and comments; the card front shows the cover photo's counts).
- `convex/lib/auth.ts` — `requireUser(ctx, token)`: every module resolves the session token through this one helper.
- `convex/auth.ts` — `login` / `me` / `logout`. The session token lives in `localStorage` on the client.
- `convex/posts.ts` — upload URL generation, feed queries, owner-checked cascade delete (images, likes, comments, notifications, storage blobs).
- `convex/likes.ts` — `toggleLike(imageId)` (creates a notification for the photo owner; unliking retracts it), `likers`.
- `convex/inspired.ts` — runway hearts: `board` (all attendees with totals) and `like` (batched, unlimited taps; totals sharded across `inspiredCounts` rows to dodge write contention).
- `convex/comments.ts` — add / list / delete-own, per photo; shown in the full-screen viewer and switching with the carousel.
- `convex/notifications.ts` — list, unread count, mark-all-read; the client shows a bell with a badge plus a small push-style banner (top of screen, 4 s, tap to dismiss) when a like arrives live.
- `convex/admin.ts` — `npx convex run admin:wipeContent` clears all posted content (keeps users), handy before the event.
- All feed queries are Convex **reactive queries**: every open phone updates live, no polling.

## Deploy

1. Create a Convex account and link the project: `npx convex login`, then `npx convex deploy` (creates the production deployment and prints its URL).
2. Push this repo to GitHub and import it in Vercel.
3. In Vercel project settings, set the env var `NEXT_PUBLIC_CONVEX_URL` to the production Convex URL.
4. Seed real attendees: `node scripts/seed.mjs attendees.csv --prod`.

(Recommended: set the Vercel build command to `npx convex deploy --cmd 'npm run build'` with the `CONVEX_DEPLOY_KEY` env var, so backend and frontend deploy together — see [Convex Vercel docs](https://docs.convex.dev/production/hosting/vercel).)
