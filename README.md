# Reel Forge

An AI short-form content studio. Paste your product's URL and Reel Forge learns your audience, writes hooks, captions and slideshows, renders ready-to-post TikToks, Instagram Reels and YouTube Shorts in the browser, and plans them on a content calendar.

Built with Next.js 15, React 19 and the Google Gemini API.

## Features

| Area | What it does |
| --- | --- |
| **Brand** | Fetches a website, App Store or Play Store page and builds a profile: audiences, pain points in their own words, benefits, tone, keywords, hashtags, CTAs. Fully editable. |
| **Competitors** | A swipe file of competitors' ads per competitor: paste copy or transcripts, upload screenshots (read with Gemini vision), import from the Meta Ad Library with run times, or research a competitor on the web with Google Search grounding and sources. A patterns report finds recurring hook shapes, angles and how crowded they are, formats, CTAs, offers, long-running ads, and gaps, then turns them into a playbook of ideas for your brand. |
| **Ideas** | Generates ideas across four formats, each with a hook, angle, caption and hashtags. Never repeats hooks you already have. One click turns an idea into a post. |
| **Formats** | A library of proven structures (POV, "nobody tells you", reaction → demo, "don't download this", listicle carousels, starter packs, expectation vs reality…). AI fills any of them in for your product. |
| **Create** | Editor with a live phone preview. Formats: hook video, hook + demo, slideshow, meme. Six text styles, four fonts, positioning, sizing, gradient fallbacks, music, timing, AI hooks and captions. |
| **Batch** | Paste or upload a CSV of hooks (`overlay, caption, hashtags`), pick a clip pool, and render every row into a video. AI fills missing captions and suggests more hooks. Download everything as a ZIP with `captions.csv`. |
| **Posts** | Library of drafts, rendered, scheduled and posted content with search, filters, bulk render and ZIP export. |
| **Media** | Upload hook clips, demo screen recordings, B-roll, images and music. Stored in the browser (IndexedDB), never uploaded. Links to free portrait stock footage. |
| **Calendar** | Month view, one-click auto-scheduling (N posts a day at set times), per-platform targeting, overdue reminders, and `.ics` export with captions in each event. |
| **Analytics** | Log views, likes, comments, shares and saves; see totals, engagement rate, top posts and per-format performance; ask AI what's working and what to make next. |
| **API** | Every AI feature is a JSON endpoint (`/api/analyze`, `/ideas`, `/hooks`, `/captions`, `/slideshow`, `/insights`, `/competitors/*`), optionally protected by a bearer key. Docs at `/studio/api`. |

Videos are rendered client-side with `<canvas>` + `MediaRecorder` (MP4/H.264 in Chrome and Edge, WebM elsewhere) at 720×1280 or 1080×1920. Slideshows can also be exported as a ZIP of 1080×1920 PNGs.

## Quick start

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes (for AI) | Key from https://aistudio.google.com/apikey. Without it, editing and rendering still work. |
| `GEMINI_MODEL` | no | Main model. Defaults to `gemini-flash-latest`. |
| `GEMINI_FALLBACK_MODEL` | no | Answers when the main model is overloaded, rate limited or slow. Defaults to `gemini-flash-lite-latest`; set it empty to turn off. |
| `GEMINI_TIMEOUT_MS` | no | How long to wait for the main model before falling back. Defaults to 45000 (research gets twice as long). |
| `META_AD_LIBRARY_TOKEN` | no | Enables importing competitor ads from Meta's Ad Library (EU-delivered ads only, per Meta). |
| `REELFORGE_API_KEY` | no | When set, `/api/*` requires `Authorization: Bearer <key>`. Enter the same key in Studio → Settings. |

Production: `npm run build && npm start`, or deploy to any Node host (Vercel works out of the box).

## How it's built

```
app/
  page.tsx                 landing page
  studio/                  the app (dashboard, brand, ideas, formats, create, batch, posts, media, calendar, analytics, api, settings)
  api/                     AI endpoints (Node runtime)
lib/
  ai.ts                    Gemini client, JSON-schema outputs, search grounding, error mapping, access key
  schemas.ts               zod schemas shared by API and UI
  fetchPage.ts             URL fetcher with private-address blocking
  render/engine.ts         canvas drawing: backgrounds, cover-fit media, text styles, Stage
  render/record.ts         real-time MediaRecorder export (+ music mixing), PNG stills
  compose.ts               post → timeline of segments
  store.ts                 app state (zustand, persisted to localStorage)
  media.ts / ingest.ts     IndexedDB blob store, thumbnails, metadata
components/                phone preview, media picker, style controls, toasts
```

AI calls ask Gemini for JSON matching a schema generated from the zod types, then validate the answer with zod. Competitor research uses Gemini with Google Search grounding.

## Notes and limits

- Rendering runs in real time; keep the tab in front while it works (browsers pause background tabs).
- Data lives in the browser. Use Settings → Export workspace to back up brand, ideas, posts and schedule.
- Posting is manual: the calendar export reminds you with the caption ready, and you add a trending sound in the platform's app.
- Stock-footage licences don't allow implying the person in a clip endorses your product. Use your own footage for first-person hooks.
