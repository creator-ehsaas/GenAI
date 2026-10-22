# Reel Forge

An AI short-form content studio. Paste your product's URL and Reel Forge learns your audience, writes hooks, captions and slideshows, renders ready-to-post TikToks, Instagram Reels and YouTube Shorts in the browser, and plans them on a content calendar.

Built with Next.js 15, React 19 and the Anthropic API (Claude).

## Features

| Area | What it does |
| --- | --- |
| **Brand** | Fetches a website, App Store or Play Store page and builds a profile: audiences, pain points in their own words, benefits, tone, keywords, hashtags, CTAs. Fully editable. |
| **Ideas** | Generates ideas across four formats, each with a hook, angle, caption and hashtags. Never repeats hooks you already have. One click turns an idea into a post. |
| **Formats** | A library of proven structures (POV, "nobody tells you", reaction → demo, "don't download this", listicle carousels, starter packs, expectation vs reality…). AI fills any of them in for your product. |
| **Create** | Editor with a live phone preview. Formats: hook video, hook + demo, slideshow, meme. Six text styles, four fonts, positioning, sizing, gradient fallbacks, music, timing, AI hooks and captions. |
| **Batch** | Paste or upload a CSV of hooks (`overlay, caption, hashtags`), pick a clip pool, and render every row into a video. AI fills missing captions and suggests more hooks. Download everything as a ZIP with `captions.csv`. |
| **Posts** | Library of drafts, rendered, scheduled and posted content with search, filters, bulk render and ZIP export. |
| **Media** | Upload hook clips, demo screen recordings, B-roll, images and music. Stored in the browser (IndexedDB), never uploaded. Links to free portrait stock footage. |
| **Calendar** | Month view, one-click auto-scheduling (N posts a day at set times), per-platform targeting, overdue reminders, and `.ics` export with captions in each event. |
| **Analytics** | Log views, likes, comments, shares and saves; see totals, engagement rate, top posts and per-format performance; ask AI what's working and what to make next. |
| **API** | Every AI feature is a JSON endpoint (`/api/analyze`, `/ideas`, `/hooks`, `/captions`, `/slideshow`, `/insights`), optionally protected by a bearer key. Docs at `/studio/api`. |

Videos are rendered client-side with `<canvas>` + `MediaRecorder` (MP4/H.264 in Chrome and Edge, WebM elsewhere) at 720×1280 or 1080×1920. Slideshows can also be exported as a ZIP of 1080×1920 PNGs.

## Quick start

```bash
npm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes (for AI) | Key from https://console.anthropic.com. Without it, editing and rendering still work. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5-5`. |
| `REELFORGE_API_KEY` | no | When set, `/api/*` requires `Authorization: Bearer <key>`. Enter the same key in Studio → Settings. |

Production: `npm run build && npm start`, or deploy to any Node host (Vercel works out of the box).

## How it's built

```
app/
  page.tsx                 landing page
  studio/                  the app (dashboard, brand, ideas, formats, create, batch, posts, media, calendar, analytics, api, settings)
  api/                     AI endpoints (Node runtime)
lib/
  ai.ts                    Anthropic client, structured outputs, error mapping, access key
  schemas.ts               zod schemas shared by API and UI
  fetchPage.ts             URL fetcher with private-address blocking
  render/engine.ts         canvas drawing: backgrounds, cover-fit media, text styles, Stage
  render/record.ts         real-time MediaRecorder export (+ music mixing), PNG stills
  compose.ts               post → timeline of segments
  store.ts                 app state (zustand, persisted to localStorage)
  media.ts / ingest.ts     IndexedDB blob store, thumbnails, metadata
components/                phone preview, media picker, style controls, toasts
```

AI calls use structured outputs validated with zod, adaptive thinking, and the server-side refusal fallback.

## Notes and limits

- Rendering runs in real time; keep the tab in front while it works (browsers pause background tabs).
- Data lives in the browser. Use Settings → Export workspace to back up brand, ideas, posts and schedule.
- Posting is manual: the calendar export reminds you with the caption ready, and you add a trending sound in the platform's app.
- Stock-footage licences don't allow implying the person in a clip endorses your product. Use your own footage for first-person hooks.
