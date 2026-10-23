"use client";
import { useEffect, useState } from "react";
import { useHealth } from "@/lib/useHealth";

const ENDPOINTS = [
  {
    path: "analyze",
    title: "Analyze a product",
    desc: "Fetches a website or App Store / Play Store page and returns a brand profile.",
    body: { url: "https://example.com", notes: "Optional extra context" },
    returns: "{ profile: BrandProfile, source: { url, title } | null, warning: string | null }",
  },
  {
    path: "ideas",
    title: "Content ideas",
    desc: "Ideas across formats: hook_video, hook_demo, slideshow, meme.",
    body: { brand: { name: "Planly", oneLiner: "A planner app for students" }, formats: ["hook_video", "slideshow"], count: 6, focus: "exam season", language: "English" },
    returns: "{ ideas: [{ format, title, angle, hook, slides[], demoLabel, caption, hashtags }] }",
  },
  {
    path: "hooks",
    title: "Hooks",
    desc: "On-screen hooks, optionally following a template.",
    body: { brand: { name: "Planly" }, count: 8, template: "POV: you [situation]", avoid: [] },
    returns: "{ hooks: string[] }",
  },
  {
    path: "captions",
    title: "Captions and hashtags",
    desc: "Fills empty captions and hashtags for up to 50 posts. Filled fields come back unchanged.",
    body: { brand: { name: "Planly" }, posts: [{ id: "1", text: "POV: you stopped missing deadlines", caption: "", hashtags: "" }] },
    returns: "{ items: [{ id, caption, hashtags }] }",
  },
  {
    path: "slideshow",
    title: "Slideshow",
    desc: "Slide texts for a photo carousel, plus caption and hashtags.",
    body: { brand: { name: "Planly" }, topic: "5 study habits that actually work", slides: 5 },
    returns: "{ slides: string[], caption, hashtags }",
  },
  {
    path: "competitors/extract",
    title: "Extract competitor ads",
    desc: "Turns pasted ad copy, transcripts or up to 10 base64 screenshots into structured ads: hook, body, CTA, offer, angle, format, run time.",
    body: { competitor: { name: "Notion" }, text: "POV: your second brain finally works…" },
    returns: "{ ads: [{ platform, format, hook, body, cta, offer, angle, visual, daysRunning, sourceUrl }] }",
  },
  {
    path: "competitors/research",
    title: "Research a competitor",
    desc: "Searches the web for a competitor's positioning, channels and ads, with sources. Takes up to a few minutes.",
    body: { competitor: { name: "Notion", url: "notion.so" } },
    returns: "{ positioning, channels[], ads[], notes[], raw }",
  },
  {
    path: "competitors/meta",
    title: "Meta Ad Library import",
    desc: "Searches Meta's Ad Library (EU-delivered commercial ads) and returns ads with days running. Needs META_AD_LIBRARY_TOKEN.",
    body: { query: "Notion", countries: ["DE", "FR"], limit: 30 },
    returns: "{ ads: [...] }",
  },
  {
    path: "competitors/patterns",
    title: "Competitor ad patterns",
    desc: "Finds hook patterns, angles and their saturation, formats, CTAs, offers, long-running ads and gaps, plus a playbook for your brand.",
    body: { brand: { name: "Planly" }, competitors: [{ name: "Notion", ads: [{ hook: "POV: …", platform: "tiktok", daysRunning: 64 }] }] },
    returns: "{ summary, hookPatterns[], angles[], formats[], ctas[], offers[], longRunners[], gaps[], playbook[] }",
  },
  {
    path: "insights",
    title: "Performance insights",
    desc: "What your best posts share and what to make next.",
    body: { brand: { name: "Planly" }, posts: [{ format: "hook_video", text: "POV: …", views: 12000, likes: 900, comments: 40, shares: 30, saves: 120 }] },
    returns: "{ summary, winners: string[], recommendations: string[] }",
  },
];

export default function ApiPage() {
  const health = useHealth();
  const [origin, setOrigin] = useState("https://your-host");
  useEffect(() => setOrigin(window.location.origin), []);
  const auth = health?.apiKeyRequired ? ` \\\n  -H "Authorization: Bearer $REELFORGE_API_KEY"` : "";

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div className="titles">
          <h1>API</h1>
          <p className="hint">
            Every AI feature in the studio is a JSON endpoint you can call from scripts, Zapier, n8n or your own app. All endpoints take <code>POST</code> with a JSON body.
            {health?.apiKeyRequired ? " This server requires a bearer key." : " Set REELFORGE_API_KEY on the server to require a bearer key."}
          </p>
        </div>
      </div>
      <section className="card flat">
        <h2>Health</h2>
        <pre>
          <code>{`curl ${origin}/api/health\n# → ${JSON.stringify(health ?? { ok: true, model: "…", aiConfigured: true, apiKeyRequired: false })}`}</code>
        </pre>
      </section>
      {ENDPOINTS.map((e) => (
        <section key={e.path} className="card flat">
          <div className="card-head">
            <span className="chip accent mono">POST /api/{e.path}</span>
            <h2>{e.title}</h2>
          </div>
          <p className="hint">{e.desc}</p>
          <pre>
            <code>{`curl -X POST ${origin}/api/${e.path} \\\n  -H "Content-Type: application/json"${auth} \\\n  -d '${JSON.stringify(e.body)}'`}</code>
          </pre>
          <p className="small">
            Returns <code>{e.returns}</code>
          </p>
        </section>
      ))}
      <section className="card flat">
        <h2>Errors</h2>
        <p className="small">
          Errors return <code>{`{ error: string }`}</code> with status 400 (bad body), 401 (missing key), 422 (model declined), 429 (rate limited) or 5xx.
        </p>
      </section>
    </div>
  );
}
