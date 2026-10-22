"use client";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Code2,
  Globe,
  Images,
  Layers,
  Lightbulb,
  Lock,
  Sparkles,
  Table2,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import "./landing.css";

const FORMATS = [
  { name: "Hook videos", body: "A scroll-stopping line over a selfie-style clip. The workhorse of organic growth.", text: "POV: you finally stopped forgetting deadlines", bg: "linear-gradient(160deg,#6d4bd8,#e2597a 60%,#f7a64b)" },
  { name: "Hook + demo", body: "A 2–3 second reaction that cuts to your product doing its thing.", text: "When you realize this app does it in 2 taps", bg: "linear-gradient(160deg,#0f2b5b,#1f6fb2,#5ad1e6)" },
  { name: "Slideshows", body: "Swipeable carousels that earn saves. Export as PNGs or a video.", text: "5 habits that got me through finals", bg: "linear-gradient(160deg,#0d4f45,#1f9e7a,#a8e6c4)" },
  { name: "Memes", body: "Top text, bottom text, instantly readable and endlessly remixable.", text: "ME ON SUNDAY · ME ON MONDAY", bg: "linear-gradient(160deg,#1b1034,#4d2a8a,#b06ad9)" },
];

const FEATURES = [
  { icon: Globe, title: "Brand analysis", body: "Paste a URL or app store link. AI maps your audience, their pains in their own words, and your angles." },
  { icon: Lightbulb, title: "Idea engine", body: "Dozens of hooks, angles and captions across four formats, never repeating what you've made." },
  { icon: Layers, title: "Proven formats", body: "POV, 'nobody tells you', reaction → demo, starter packs, expectation vs reality, and more." },
  { icon: Video, title: "In-browser studio", body: "Live phone preview, six text styles, music, timing. Renders MP4 right in your browser." },
  { icon: Table2, title: "Batch mode", body: "Paste 50 hooks, pick a clip pool, and get 50 captioned videos plus a captions CSV in one ZIP." },
  { icon: Images, title: "Slideshow maker", body: "AI writes the slides; export a PNG carousel for TikTok and Instagram, or a video." },
  { icon: CalendarDays, title: "Content calendar", body: "Auto-schedule a month in one click. Export to Google or Apple Calendar with captions attached." },
  { icon: BarChart3, title: "Analytics + insights", body: "Log results, see what format and hook shape wins, and get AI recommendations for what's next." },
  { icon: Code2, title: "API", body: "Every AI feature is a JSON endpoint for your scripts, Zapier or n8n flows." },
];

const FAQ = [
  ["Do I need to film anything?", "No. Use free stock clips (links are built in), your own selfie clips, screen recordings, or no media at all: posts fall back to clean gradient backgrounds."],
  ["Where are my videos stored?", "In your browser. Clips, images and rendered videos live in IndexedDB on your device and never leave it. Only text (your brand profile and hooks) is sent to the AI."],
  ["What file format do videos come out in?", "MP4 (H.264) in Chrome and Edge on desktop, which every platform accepts. Some browsers record WebM instead; the app tells you when that happens."],
  ["Does it post for me?", "Not yet. Reel Forge schedules, reminds you with the caption ready (via calendar export), and tracks results. Posting natively uses each platform's app so you can add trending sounds."],
  ["What languages does it write in?", "English, Hinglish, Hindi, Spanish, Portuguese, French, German, Indonesian, Arabic and Japanese, set in Settings."],
];

const Phone = ({ className, text, bg, box }: { className: string; text: string; bg: string; box?: boolean }) => (
  <div className={`lp-phone ${className}`} aria-hidden="true">
    <div className="scr" style={{ background: bg }}>
      <div className={`ov ${box ? "box" : ""}`}>{box ? <span>{text}</span> : text}</div>
      <div className="face" />
    </div>
  </div>
);

export default function Landing() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const go = () => router.push(url.trim() ? `/studio/brand?url=${encodeURIComponent(url.trim())}` : "/studio");

  return (
    <div className="lp">
      <div className="lp-wrap">
        <nav className="lp-nav">
          <Link href="/" className="brandmark" style={{ padding: 0 }}>
            <span className="logo">
              <Zap />
            </span>
            Reel Forge
          </Link>
          <div className="links">
            <a href="#how">How it works</a>
            <a href="#formats">Formats</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
            <Link className="btn primary sm" href="/studio">
              Open studio
            </Link>
          </div>
        </nav>

        <header className="hero">
          <div>
            <span className="chip accent">
              <Sparkles size={13} /> AI short-form content studio
            </span>
            <h1 style={{ marginTop: 16 }}>
              Turn your product into <em>a month of viral-style videos</em>
            </h1>
            <p className="lede">
              Paste your link. Reel Forge learns your audience, writes the hooks, and renders ready-to-post TikToks, Reels and Shorts, with captions and a posting
              schedule. No filming, no editing.
            </p>
            <form
              className="urlbox"
              onSubmit={(e) => {
                e.preventDefault();
                go();
              }}
            >
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourproduct.com or an App Store link" aria-label="Product URL" />
              <button className="btn primary" type="submit">
                Generate content <ArrowRight />
              </button>
            </form>
            <div className="proof">
              <span>
                <Check /> Self-hosted, your own API key
              </span>
              <span>
                <Check /> Media stays on your device
              </span>
              <span>
                <Check /> MP4 export
              </span>
            </div>
          </div>
          <div className="phones">
            <Phone className="p1" text="Things nobody tells you about your first job" bg="linear-gradient(160deg,#0f2b5b,#1f6fb2,#5ad1e6)" />
            <Phone className="p2" text="POV: you finally found an app that plans your week for you" bg="linear-gradient(160deg,#6d4bd8,#e2597a 60%,#f7a64b)" box />
            <Phone className="p3" text="Me acting normal after finding the best study hack" bg="linear-gradient(160deg,#0d4f45,#1f9e7a,#a8e6c4)" />
          </div>
        </header>

        <section className="lp-sec" id="how">
          <span className="eyebrow">How it works</span>
          <h2>From URL to a full content calendar in minutes</h2>
          <div className="steps3">
            {[
              { icon: Globe, n: "01", t: "Drop your link", b: "Website, App Store or Play Store. AI builds your brand profile: audiences, pains, benefits, tone, hashtags." },
              { icon: Sparkles, n: "02", t: "Generate and render", b: "Pick formats, get ideas, and batch-render captioned videos over your clips, right in the browser." },
              { icon: CalendarDays, n: "03", t: "Schedule and learn", b: "Auto-fill your calendar, post with the caption ready, log results and let AI tell you what to double down on." },
            ].map((s) => (
              <div key={s.n} className="lp-card">
                <span className="step">{s.n}</span>
                <span className="ic">
                  <s.icon />
                </span>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="formats">
          <span className="eyebrow">Formats</span>
          <h2>The formats that actually grow accounts</h2>
          <p className="sub">Every format is built on structures that perform organically, so you post more and guess less.</p>
          <div className="fgrid">
            {FORMATS.map((f) => (
              <div key={f.name} className="fmt">
                <div className="vis" style={{ background: f.bg }}>
                  {f.text}
                </div>
                <div className="meta">
                  <h3>{f.name}</h3>
                  <p>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="features">
          <span className="eyebrow">Everything included</span>
          <h2>One studio for the whole short-form loop</h2>
          <div className="feat">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-card">
                <span className="ic">
                  <f.icon />
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-sec" id="faq">
          <span className="eyebrow">FAQ</span>
          <h2>Questions</h2>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-sec cta">
          <span className="logo" style={{ width: 48, height: 48, borderRadius: 14 }}>
            <Zap />
          </span>
          <h2>Stop staring at a blank caption box</h2>
          <p className="sub">Your next 30 posts are one link away.</p>
          <Link className="btn primary" href="/studio" style={{ padding: "14px 22px", fontSize: 16 }}>
            Open the studio <ArrowRight />
          </Link>
        </section>

        <footer className="lp-foot">
          <span>© {new Date().getFullYear()} Reel Forge</span>
          <span className="spacer" />
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Lock size={14} /> Your media never leaves your browser
          </span>
        </footer>
      </div>
    </div>
  );
}
