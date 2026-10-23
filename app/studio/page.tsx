"use client";
import { ArrowRight, CalendarDays, Clapperboard, FolderOpen, Lightbulb, Sparkles, Store, Table2 } from "lucide-react";
import Link from "next/link";
import { AiBanner } from "@/components/AiBanner";
import { postText, STATUS_LABELS } from "@/lib/compose";
import { useStore } from "@/lib/store";

const STEPS = [
  { href: "/studio/brand", icon: Store, title: "Add your brand", body: "Paste your site or app store link. AI builds a profile of your audience and their pains.", done: (s: S) => Boolean(s.brand) },
  { href: "/studio/media", icon: FolderOpen, title: "Upload clips", body: "Selfie-style reactions, screen recordings, photos and music.", done: (s: S) => s.media.length > 0 },
  { href: "/studio/ideas", icon: Lightbulb, title: "Generate ideas", body: "Hooks, angles and captions across four proven formats.", done: (s: S) => s.ideas.length > 0 },
  { href: "/studio/batch", icon: Table2, title: "Make videos", body: "One at a time in Create, or dozens at once in Batch.", done: (s: S) => s.posts.some((p) => p.renderId) },
  { href: "/studio/calendar", icon: CalendarDays, title: "Schedule", body: "Auto-fill your calendar and export reminders.", done: (s: S) => s.posts.some((p) => p.scheduledAt) },
];
type S = ReturnType<typeof useStore.getState>;

export default function Dashboard() {
  const s = useStore();
  const { brand, posts, ideas, media } = s;
  const rendered = posts.filter((p) => p.renderId).length;
  const scheduled = posts.filter((p) => p.status === "scheduled");
  const upcoming = scheduled.filter((p) => p.scheduledAt && new Date(p.scheduledAt) > new Date()).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const done = STEPS.filter((x) => x.done(s)).length;

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>{brand ? `${brand.name} content studio` : "Welcome to Reel Forge"}</h1>
          <p className="hint">{brand ? brand.oneLiner : "Turn your product into a steady stream of short-form videos for TikTok, Reels and Shorts."}</p>
        </div>
        <div className="row">
          <Link className="btn" href="/studio/ideas">
            <Sparkles /> New ideas
          </Link>
          <Link className="btn primary" href="/studio/create">
            <Clapperboard /> Create post
          </Link>
        </div>
      </div>
      <AiBanner />

      <div className="grid4">
        <Link href="/studio/ideas" className="stat" style={{ textDecoration: "none" }}>
          <span className="k">Ideas</span>
          <span className="v">{ideas.length}</span>
        </Link>
        <Link href="/studio/posts" className="stat" style={{ textDecoration: "none" }}>
          <span className="k">Posts · rendered</span>
          <span className="v">
            {posts.length} · {rendered}
          </span>
        </Link>
        <Link href="/studio/calendar" className="stat" style={{ textDecoration: "none" }}>
          <span className="k">Scheduled</span>
          <span className="v">{scheduled.length}</span>
        </Link>
        <Link href="/studio/media" className="stat" style={{ textDecoration: "none" }}>
          <span className="k">Media files</span>
          <span className="v">{media.length}</span>
        </Link>
      </div>

      {done < STEPS.length && (
        <section className="card">
          <div className="card-head">
            <h2>Get set up</h2>
            <span className="chip accent">
              {done} / {STEPS.length}
            </span>
          </div>
          <div className="list">
            {STEPS.map((st, i) => {
              const ok = st.done(s);
              return (
                <Link key={st.href} href={st.href} className="item" style={{ textDecoration: "none", opacity: ok ? 0.6 : 1 }}>
                  <span className="num" style={ok ? { background: "var(--ok-soft)", color: "var(--ok)" } : undefined}>
                    {ok ? "✓" : i + 1}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="t" style={{ display: "block" }}>
                      {st.title}
                    </span>
                    <span className="m" style={{ display: "block", whiteSpace: "normal" }}>
                      {st.body}
                    </span>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid2" style={{ alignItems: "start" }}>
        <section className="card">
          <div className="card-head">
            <h2>Up next</h2>
            <span className="spacer" />
            <Link className="btn sm ghost" href="/studio/calendar">
              Calendar <ArrowRight />
            </Link>
          </div>
          {upcoming.length ? (
            <div className="list">
              {upcoming.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/studio/create?id=${p.id}`} className="item" style={{ gridTemplateColumns: "auto minmax(0,1fr)", textDecoration: "none" }}>
                  <span className="mono small">{new Date(p.scheduledAt!).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="t">{p.title || postText(p)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted small">Nothing scheduled yet.</p>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Recent posts</h2>
            <span className="spacer" />
            <Link className="btn sm ghost" href="/studio/posts">
              All posts <ArrowRight />
            </Link>
          </div>
          {posts.length ? (
            <div className="list">
              {posts.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/studio/create?id=${p.id}`} className="item" style={{ gridTemplateColumns: "minmax(0,1fr) auto", textDecoration: "none" }}>
                  <span className="t">{p.title || postText(p) || "Untitled"}</span>
                  <span className="chip">{STATUS_LABELS[p.status]}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted small">No posts yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
