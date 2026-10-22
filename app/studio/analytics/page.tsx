"use client";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AiBanner } from "@/components/AiBanner";
import { api } from "@/lib/api";
import { postText } from "@/lib/compose";
import { FORMAT_LABELS, FORMATS } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Insights } from "@/lib/schemas";
import type { Metrics, Post } from "@/lib/types";

const ZERO: Metrics = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
const KEYS: (keyof Metrics)[] = ["views", "likes", "comments", "shares", "saves"];
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
const eng = (m: Metrics) => (m.views ? (m.likes + m.comments + m.shares + m.saves) / m.views : 0);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Horizontal bars of views per post: one series, so one color and no legend. */
function ViewsChart({ posts }: { posts: Post[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const data = posts.filter((p) => p.metrics).sort((a, b) => b.metrics!.views - a.metrics!.views).slice(0, 12);
  const max = Math.max(1, ...data.map((p) => p.metrics!.views));
  if (!data.length) return <p className="muted small">Enter views for posted videos below to see the chart.</p>;
  return (
    <div style={{ display: "grid", gap: 6 }} role="list" aria-label="Views per post">
      {data.map((p) => {
        const m = p.metrics!;
        const on = hover === p.id;
        return (
          <div
            key={p.id}
            role="listitem"
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr) 56px", gap: 10, alignItems: "center", fontSize: 13, position: "relative", padding: "3px 0" }}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: on ? "var(--fg)" : "var(--muted)" }}>{p.title || postText(p)}</span>
            <span style={{ height: 14, background: "var(--sunk)", borderRadius: 4 }}>
              <span style={{ display: "block", height: "100%", width: `${(m.views / max) * 100}%`, minWidth: 2, background: "var(--accent)", borderRadius: "0 4px 4px 0", opacity: hover && !on ? 0.45 : 1 }} />
            </span>
            <span className="mono" style={{ textAlign: "right" }}>
              {fmt(m.views)}
            </span>
            {on && (
              <div className="toast" style={{ position: "absolute", left: "30%", bottom: "100%", zIndex: 5, fontSize: 12.5, display: "grid", gap: 2, pointerEvents: "none" }}>
                <b>{(p.title || postText(p)).slice(0, 60)}</b>
                <span>
                  {fmt(m.views)} views · {fmt(m.likes)} likes · {fmt(m.comments)} comments · {fmt(m.shares)} shares · {fmt(m.saves)} saves
                </span>
                <span>Engagement {pct(eng(m))}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { posts, updatePost, brand } = useStore();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [busy, setBusy] = useState(false);
  const posted = posts.filter((p) => p.status === "posted");
  const measured = posted.filter((p) => p.metrics && p.metrics.views > 0);

  const totals = useMemo(() => measured.reduce((t, p) => ({ ...Object.fromEntries(KEYS.map((k) => [k, t[k] + p.metrics![k]])) }) as Metrics, ZERO), [measured]);
  const byFormat = FORMATS.map((f) => {
    const ps = measured.filter((p) => p.format === f);
    const views = ps.reduce((s, p) => s + p.metrics!.views, 0);
    return { f, n: ps.length, avg: ps.length ? views / ps.length : 0, eng: ps.length ? ps.reduce((s, p) => s + eng(p.metrics!), 0) / ps.length : 0 };
  }).filter((r) => r.n);

  const setMetric = (p: Post, k: keyof Metrics, v: number) => updatePost(p.id, { metrics: { ...(p.metrics ?? ZERO), [k]: Math.max(0, v || 0) } });

  const analyze = async () => {
    setBusy(true);
    try {
      const r = await api<Insights>("insights", {
        brand,
        posts: measured.map((p) => ({ format: p.format, text: postText(p), platform: p.platforms.join(","), ...p.metrics! })),
      });
      setInsights(r);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't analyze", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Analytics</h1>
          <p className="hint">Log each posted video&apos;s numbers from TikTok, Instagram or YouTube, see what works, and let AI tell you what to make next.</p>
        </div>
      </div>
      <AiBanner />

      <div className="grid4">
        <div className="stat">
          <span className="k">Posted</span>
          <span className="v">{posted.length}</span>
        </div>
        <div className="stat">
          <span className="k">Total views</span>
          <span className="v">{fmt(totals.views)}</span>
        </div>
        <div className="stat">
          <span className="k">Avg views / post</span>
          <span className="v">{measured.length ? fmt(totals.views / measured.length) : "–"}</span>
        </div>
        <div className="stat">
          <span className="k">Engagement rate</span>
          <span className="v">{totals.views ? pct(eng(totals)) : "–"}</span>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>Views by post</h2>
          <ViewsChart posts={measured} />
        </section>
        <section className="card">
          <div className="card-head">
            <h2>AI insights</h2>
            <span className="spacer" />
            <button className="btn sm primary" onClick={analyze} disabled={busy || measured.length < 2}>
              {busy ? <span className="spin" /> : <Sparkles />} Analyze
            </button>
          </div>
          {measured.length < 2 && <p className="muted small">Log numbers for at least two posts.</p>}
          {insights && (
            <div className="stack small">
              <p>{insights.summary}</p>
              <div>
                <b>What the winners share</b>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {insights.winners.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
              <div>
                <b>Make next</b>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {insights.recommendations.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {byFormat.length > 0 && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Format</th>
                  <th className="num">Posts</th>
                  <th className="num">Avg views</th>
                  <th className="num">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {byFormat.map((r) => (
                  <tr key={r.f}>
                    <td>{FORMAT_LABELS[r.f]}</td>
                    <td className="num">{r.n}</td>
                    <td className="num">{fmt(r.avg)}</td>
                    <td className="num">{pct(r.eng)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Log results</h2>
        {posted.length ? (
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Date</th>
                  {KEYS.map((k) => (
                    <th key={k} className="num">
                      {k}
                    </th>
                  ))}
                  <th className="num">Eng.</th>
                </tr>
              </thead>
              <tbody>
                {posted.map((p) => (
                  <tr key={p.id}>
                    <td style={{ maxWidth: 260 }}>
                      <Link href={`/studio/create?id=${p.id}`} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title || postText(p)}
                      </Link>
                      <span className="small muted">{FORMAT_LABELS[p.format]}</span>
                    </td>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>
                      {p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString() : ""}
                    </td>
                    {KEYS.map((k) => (
                      <td key={k} className="num">
                        <input type="number" min={0} value={p.metrics?.[k] ?? 0} onChange={(e) => setMetric(p, k, +e.target.value)} aria-label={`${k} for ${postText(p)}`} />
                      </td>
                    ))}
                    <td className="num mono small">{p.metrics?.views ? pct(eng(p.metrics)) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <h3>No posted videos yet</h3>
            <p>Mark posts as posted from Posts or the Calendar, then log their numbers here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
