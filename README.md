# Friendsgiving 🎄

Party site for Friendsgiving (Sat 21 Nov): QR join with balanced teams, live "happening now" feed, Impostor, Mafia, ugly T-shirt swap, Secret Santa swap, ugliest-shirt vote and a live spelling-bee scoreboard.

- `/` info · `/join` QR landing · `/me` each guest's live party page · `/scores` TV scoreboard · `/host` PIN-protected host dashboard

## Deploy (Vercel)
1. Import this repo into Vercel (Next.js is auto-detected).
2. Storage → add **Upstash for Redis** (free) and connect it to the project (sets `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
3. Add env var `HOST_PIN` (your host dashboard PIN), then redeploy.

Without Redis the site runs on an in-memory store (fine for local dev only).

## Local
`npm install && HOST_PIN=1234 npm run dev`
