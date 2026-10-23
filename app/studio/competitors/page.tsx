"use client";
import { Clock, Download, ExternalLink, Globe, ImagePlus, Plus, Search, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AiBanner, BrandHint } from "@/components/AiBanner";
import { api, ApiError } from "@/lib/api";
import { prepareScreenshot } from "@/lib/images";
import { downloadBlob } from "@/lib/media";
import { type CompetitorAd, type CompetitorResearch, FORMAT_LABELS, type PatternReport } from "@/lib/schemas";
import { newPost, postFromIdea, useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Competitor, SavedAd } from "@/lib/types";

const enc = encodeURIComponent;
const findLinks = (c: Competitor) => [
  ["Meta Ad Library", `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${enc(c.name)}&search_type=keyword_unordered`],
  ["TikTok Top Ads", "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en"],
  ["TikTok search", `https://www.tiktok.com/search?q=${enc(c.name)}`],
  ["YouTube Shorts", `https://www.youtube.com/results?search_query=${enc(c.name + " #shorts")}`],
  ["Google Ads Transparency", "https://adstransparency.google.com/"],
];

const SAT_CHIP = { crowded: "err", contested: "warn", open: "ok" } as const;

/* ---------------- swipe file ---------------- */

function AdCard({ ad, onRemove }: { ad: SavedAd; onRemove: () => void }) {
  return (
    <article className="card flat" style={{ gridTemplateColumns: ad.thumb ? "72px minmax(0,1fr)" : "minmax(0,1fr)", alignItems: "start", padding: 14 }}>
      {ad.thumb && <img src={ad.thumb} alt="" style={{ width: 72, borderRadius: 8, border: "1px solid var(--line)" }} />}
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <div className="row" style={{ gap: 6, flex: 1 }}>
            <span className="chip">{ad.platform}</span>
            {ad.format && <span className="chip">{ad.format}</span>}
            {ad.daysRunning != null && (
              <span className={`chip ${ad.daysRunning >= 30 ? "ok" : ""}`} title="Days the ad has been running">
                <Clock size={12} /> {ad.daysRunning} days
              </span>
            )}
          </div>
          {ad.sourceUrl && (
            <a className="btn icon sm ghost" href={ad.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Open source" title="Open source">
              <ExternalLink />
            </a>
          )}
          <button className="btn icon sm ghost danger" onClick={onRemove} aria-label="Remove ad" title="Remove ad">
            <Trash2 />
          </button>
        </div>
        <b style={{ lineHeight: 1.35 }}>{ad.hook || "(no hook)"}</b>
        {ad.body && (
          <p className="small muted" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ad.body}
          </p>
        )}
        <p className="small">
          {[ad.angle && `Angle: ${ad.angle}`, ad.cta && `CTA: ${ad.cta}`, ad.offer && `Offer: ${ad.offer}`].filter(Boolean).join(" · ")}
        </p>
        {ad.visual && <p className="small muted">On screen: {ad.visual}</p>}
      </div>
    </article>
  );
}

function AddAds({ c }: { c: Competitor }) {
  const { addAds } = useStore();
  const [mode, setMode] = useState<"paste" | "screens" | "meta">("paste");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [metaQuery, setMetaQuery] = useState(c.name);
  const [countries, setCountries] = useState("DE, FR, NL");
  const fileRef = useRef<HTMLInputElement>(null);

  const extractText = async () => {
    setBusy("paste");
    try {
      const r = await api<{ ads: CompetitorAd[] }>("competitors/extract", { competitor: { name: c.name, url: c.url }, text });
      const n = addAds(c.id, r.ads, "paste");
      toast(n ? `Added ${n} ad${n === 1 ? "" : "s"}` : "No new ads found in that text", n ? "ok" : "info");
      if (n) setText("");
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  const extractScreens = async (files: FileList) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 20);
    let added = 0;
    for (const [i, f] of list.entries()) {
      setBusy(`Reading screenshot ${i + 1} of ${list.length}…`);
      try {
        const img = await prepareScreenshot(f);
        const r = await api<{ ads: CompetitorAd[] }>("competitors/extract", {
          competitor: { name: c.name, url: c.url },
          images: [{ mediaType: img.mediaType, data: img.data }],
        });
        added += addAds(c.id, r.ads, "screenshot", r.ads.length === 1 ? [img.thumb] : undefined);
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, "err");
      }
    }
    setBusy(null);
    toast(`Added ${added} ad${added === 1 ? "" : "s"} from ${list.length} screenshot${list.length === 1 ? "" : "s"}`, added ? "ok" : "info");
  };

  const importMeta = async () => {
    setBusy("meta");
    try {
      const r = await api<{ ads: (CompetitorAd & { pageName: string })[] }>("competitors/meta", {
        query: metaQuery,
        countries: countries
          .split(/[\s,]+/)
          .map((x) => x.trim().toUpperCase())
          .filter((x) => x.length === 2),
        limit: 50,
      });
      const n = addAds(c.id, r.ads, "meta");
      toast(r.ads.length ? `Imported ${n} new ad${n === 1 ? "" : "s"} (${r.ads.length} found)` : "Meta returned no ads for that search", n ? "ok" : "info");
    } catch (e) {
      toast(e instanceof ApiError && e.status === 501 ? "Meta import isn't set up on this server. See the note below." : (e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h2>Add ads</h2>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="How to add ads">
          <button aria-pressed={mode === "paste"} onClick={() => setMode("paste")}>
            Paste
          </button>
          <button aria-pressed={mode === "screens"} onClick={() => setMode("screens")}>
            Screenshots
          </button>
          <button aria-pressed={mode === "meta"} onClick={() => setMode("meta")}>
            Meta Ad Library
          </button>
        </div>
      </div>

      {mode === "paste" && (
        <>
          <p className="hint">Paste ad copy, video transcripts or a list of hooks. Claude splits it into separate ads and tags each one.</p>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"POV: you finally found a planner that plans for you…\nStarted running on Mar 3, 2026 · Instagram, Facebook\n\n---\n\nStop rewriting your to-do list every morning…"} />
          <div className="row">
            <button className="btn primary" onClick={extractText} disabled={busy !== null || !text.trim()}>
              {busy === "paste" ? <span className="spin" /> : <Sparkles />} Extract ads
            </button>
          </div>
        </>
      )}

      {mode === "screens" && (
        <>
          <p className="hint">
            Screenshot ads from the Meta Ad Library, TikTok Top Ads or your feed. Claude reads the on-screen text, copy, CTA and the &quot;Started running&quot; date.
          </p>
          <div className="row">
            <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy && busy !== "paste" && busy !== "meta" ? <span className="spin" /> : <ImagePlus />} Upload screenshots
            </button>
            {busy && busy.startsWith("Reading") && <span className="status">{busy}</span>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) extractScreens(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </>
      )}

      {mode === "meta" && (
        <>
          <p className="hint">
            Imports ads straight from Meta&apos;s Ad Library, with how long each has run. Meta only returns commercial ads delivered in the EU, so search EU countries.
          </p>
          <div className="grid2">
            <label className="field">
              <span className="label">Search terms</span>
              <input type="text" value={metaQuery} onChange={(e) => setMetaQuery(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">EU countries</span>
              <input type="text" value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="DE, FR, NL" />
            </label>
          </div>
          <div className="row">
            <button className="btn primary" onClick={importMeta} disabled={busy !== null || !metaQuery.trim()}>
              {busy === "meta" ? <span className="spin" /> : <Download />} Import ads
            </button>
          </div>
          <p className="note">
            Needs <code>META_AD_LIBRARY_TOKEN</code> on the server: a Meta access token from an account that has confirmed its identity for the Ad Library API.
          </p>
        </>
      )}

      <div className="field">
        <span className="label">Find more of their ads</span>
        <div className="row" style={{ gap: 6 }}>
          {findLinks(c).map(([l, h]) => (
            <a key={l} className="btn sm" href={h} target="_blank" rel="noopener noreferrer">
              {l} <ExternalLink />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetitorDetail({ c }: { c: Competitor }) {
  const { updateCompetitor, removeCompetitor, removeAd, addAds } = useStore();
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<"new" | "long">("long");

  const research = async () => {
    setBusy(true);
    try {
      const r = await api<CompetitorResearch & { raw: string }>("competitors/research", { competitor: { name: c.name, url: c.url } });
      updateCompetitor(c.id, { positioning: r.positioning, channels: r.channels, research: r.raw });
      const n = addAds(c.id, r.ads, "research");
      toast(`Research done${n ? `, ${n} ad${n === 1 ? "" : "s"} added` : ""}`, "ok");
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const ads = [...c.ads].sort((a, b) => (sort === "long" ? (b.daysRunning ?? -1) - (a.daysRunning ?? -1) : b.addedAt - a.addedAt));

  return (
    <div className="stack lg">
      <section className="card">
        <div className="card-head">
          <h2>{c.name}</h2>
          {c.url && (
            <a className="small" href={/^https?:/.test(c.url) ? c.url : `https://${c.url}`} target="_blank" rel="noopener noreferrer">
              {c.url.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="spacer" />
          <button className="btn sm" onClick={research} disabled={busy}>
            {busy ? <span className="spin" /> : <Globe />} {busy ? "Researching the web…" : c.positioning ? "Research again" : "Research on the web"}
          </button>
          <button
            className="btn icon sm ghost danger"
            aria-label={`Delete ${c.name}`}
            title="Delete competitor"
            onClick={() => confirm(`Delete ${c.name} and its ${c.ads.length} saved ads?`) && removeCompetitor(c.id)}
          >
            <Trash2 />
          </button>
        </div>
        {c.positioning ? <p>{c.positioning}</p> : <p className="hint">Research pulls their positioning, channels and any ads written about online, with sources. It takes a minute.</p>}
        {c.channels.length > 0 && (
          <div className="row" style={{ gap: 6 }}>
            {c.channels.map((ch) => (
              <span key={ch} className="chip">
                {ch}
              </span>
            ))}
          </div>
        )}
        {c.research && (
          <details>
            <summary className="small" style={{ cursor: "pointer" }}>
              Research notes and sources
            </summary>
            <p className="small muted" style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
              {c.research}
            </p>
          </details>
        )}
        <label className="field">
          <span className="label">Your notes</span>
          <textarea rows={2} value={c.notes} onChange={(e) => updateCompetitor(c.id, { notes: e.target.value })} placeholder="Pricing, what customers say about them, what to avoid copying…" />
        </label>
      </section>

      <AddAds c={c} />

      <section className="stack">
        <div className="row between">
          <h2>Swipe file · {c.ads.length}</h2>
          <div className="seg" role="group" aria-label="Sort ads">
            <button aria-pressed={sort === "long"} onClick={() => setSort("long")}>
              Longest running
            </button>
            <button aria-pressed={sort === "new"} onClick={() => setSort("new")}>
              Newest
            </button>
          </div>
        </div>
        {ads.length ? (
          <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {ads.map((a) => (
              <AdCard key={a.id} ad={a} onRemove={() => removeAd(c.id, a.id)} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>No ads saved yet</h3>
            <p>Paste their ad copy, upload screenshots, or import from the Meta Ad Library above.</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- patterns ---------------- */

function reportMarkdown(r: PatternReport) {
  const L: string[] = ["# Competitor ad patterns", "", r.summary, "", "## Hook patterns"];
  r.hookPatterns.forEach((h) => L.push(`### ${h.name} (${h.count})`, `Template: ${h.template}`, `Used by: ${h.competitors.join(", ")}`, ...h.examples.map((e) => `- "${e}"`), h.why, ""));
  L.push("## Angles", ...r.angles.map((a) => `- ${a.angle} — ${a.saturation} (${a.competitors.join(", ")})`), "", "## Formats", ...r.formats.map((f) => `- ${f.format} (${f.count}): ${f.notes}`));
  L.push("", "## CTAs", ...r.ctas.map((c) => `- ${c}`), "", "## Offers", ...r.offers.map((c) => `- ${c}`));
  if (r.longRunners.length) L.push("", "## Long runners", ...r.longRunners.map((l) => `- ${l.competitor}, ${l.daysRunning} days: "${l.hook}" — ${l.whyItLasts}`));
  L.push("", "## Gaps", ...r.gaps.map((g) => `- **${g.opportunity}** — ${g.why}`), "", "## Playbook");
  r.playbook.forEach((p) => L.push(`### ${p.title} (${FORMAT_LABELS[p.format]})`, `Template: ${p.hookTemplate}`, `Example: ${p.exampleHook}`, p.rationale, ""));
  return L.join("\n");
}

function Patterns() {
  const router = useRouter();
  const { competitors, brand, report, setReport, addIdeas, addPosts, settings } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [hooks, setHooks] = useState<Record<string, string[]>>({});
  const total = competitors.reduce((n, c) => n + c.ads.length, 0);
  const stale = report && report.adCount !== total;

  const analyze = async () => {
    setBusy("report");
    try {
      const r = await api<PatternReport>("competitors/patterns", {
        brand,
        competitors: competitors
          .filter((c) => c.ads.length)
          .map((c) => ({
            name: c.name,
            positioning: c.positioning || undefined,
            ads: c.ads.map(({ platform, format, hook, body, cta, offer, angle, visual, daysRunning }) => ({ platform, format, hook, body: body.slice(0, 600), cta, offer, angle, visual, daysRunning })),
          })),
      });
      setReport({ report: r, createdAt: Date.now(), adCount: total, competitorIds: competitors.map((c) => c.id) });
      toast("Patterns found", "ok");
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  const writeHooks = async (key: string, template: string) => {
    setBusy(key);
    try {
      const r = await api<{ hooks: string[] }>("hooks", { brand, count: 6, template, language: settings.language });
      setHooks((h) => ({ ...h, [key]: r.hooks }));
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  const r = report?.report;

  return (
    <div className="stack lg">
      <section className="card">
        <div className="card-head">
          <h2>Find the patterns</h2>
          <span className="spacer" />
          {r && (
            <button className="btn sm" onClick={() => downloadBlob(new Blob([reportMarkdown(r)], { type: "text/markdown" }), "competitor-patterns.md")}>
              <Download /> Export
            </button>
          )}
          <button className="btn primary" onClick={analyze} disabled={busy !== null || total < 3}>
            {busy === "report" ? <span className="spin" /> : <Wand2 />} {r ? "Re-analyze" : "Analyze"} {total} ads
          </button>
        </div>
        <p className="hint">
          Claude compares every saved ad across {competitors.length} competitor{competitors.length === 1 ? "" : "s"}: hook shapes, angles, formats, offers, which ads keep running, and
          the gaps you can own. {total < 3 && "Save at least 3 ads first."}
        </p>
        {busy === "report" && <p className="status">Analyzing… this can take a minute.</p>}
        {stale && <p className="status warn">You&apos;ve added or removed ads since this report. Re-analyze to include them.</p>}
        {report && <p className="small muted">Last analyzed {new Date(report.createdAt).toLocaleString()} · {report.adCount} ads</p>}
      </section>

      {r && (
        <>
          <section className="card">
            <h2>Summary</h2>
            <p>{r.summary}</p>
          </section>

          <section className="stack">
            <h2>Hook patterns</h2>
            <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
              {r.hookPatterns.map((h, i) => (
                <article key={i} className="card" style={{ alignContent: "start" }}>
                  <div className="row">
                    <h3 style={{ flex: 1 }}>{h.name}</h3>
                    <span className="chip accent">{h.count} ads</span>
                  </div>
                  <p className="small" style={{ fontWeight: 600 }}>
                    {h.template}
                  </p>
                  <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                    {h.examples.map((e, k) => (
                      <li key={k}>“{e}”</li>
                    ))}
                  </ul>
                  <p className="small">{h.why}</p>
                  <p className="small muted">Used by {h.competitors.join(", ")}</p>
                  <button className="btn sm" style={{ justifySelf: "start" }} onClick={() => writeHooks(`h${i}`, h.template)} disabled={busy !== null}>
                    {busy === `h${i}` ? <span className="spin" /> : <Sparkles />} Write 6 for my brand
                  </button>
                  {hooks[`h${i}`] && (
                    <div className="stack" style={{ gap: 6 }}>
                      {hooks[`h${i}`].map((hk) => (
                        <div key={hk} className="row" style={{ flexWrap: "nowrap" }}>
                          <span className="small" style={{ flex: 1 }}>
                            {hk}
                          </span>
                          <button
                            className="btn icon sm ghost"
                            aria-label="Add as draft"
                            title="Add as draft"
                            onClick={() => {
                              addPosts([newPost("hook_video", { hook: hk, title: `${h.name}: ${hk.slice(0, 32)}` }, settings.defaultStyle)]);
                              toast("Added to Posts as a draft", "ok");
                            }}
                          >
                            <Plus />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <div className="grid2" style={{ alignItems: "start" }}>
            <section className="card">
              <h2>Angles</h2>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Angle</th>
                    <th>Who uses it</th>
                    <th>Space</th>
                  </tr>
                </thead>
                <tbody>
                  {r.angles.map((a, i) => (
                    <tr key={i}>
                      <td>{a.angle}</td>
                      <td className="small muted">{a.competitors.join(", ")}</td>
                      <td>
                        <span className={`chip ${SAT_CHIP[a.saturation]}`}>{a.saturation}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h2>Formats</h2>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Format</th>
                    <th className="num">Ads</th>
                  </tr>
                </thead>
                <tbody>
                  {r.formats.map((f, i) => (
                    <tr key={i}>
                      <td>
                        {f.format}
                        <div className="small muted">{f.notes}</div>
                      </td>
                      <td className="num">{f.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(r.ctas.length > 0 || r.offers.length > 0) && (
                <div className="grid2">
                  <div>
                    <span className="label">CTAs</span>
                    <ul className="small" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                      {r.ctas.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="label">Offers</span>
                    <ul className="small" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                      {r.offers.length ? r.offers.map((c, i) => <li key={i}>{c}</li>) : <li className="muted">None seen</li>}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          </div>

          {r.longRunners.length > 0 && (
            <section className="card">
              <h2>Long runners</h2>
              <p className="hint">Paid ads that keep running are usually making money. These are the ones to learn from.</p>
              <div className="list">
                {r.longRunners.map((l, i) => (
                  <div key={i} className="item" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
                    <span className="chip ok">
                      <Clock size={12} /> {l.daysRunning} days
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="t" style={{ display: "block", whiteSpace: "normal" }}>
                        “{l.hook}” <span className="muted">· {l.competitor}</span>
                      </span>
                      <span className="m" style={{ display: "block", whiteSpace: "normal" }}>
                        {l.whyItLasts}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <h2>Gaps you can own</h2>
            <div className="list">
              {r.gaps.map((g, i) => (
                <div key={i} className="item" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                  <span>
                    <b>{g.opportunity}</b>
                    <span className="m" style={{ display: "block", whiteSpace: "normal" }}>
                      {g.why}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="stack">
            <div className="row between">
              <h2>Your playbook</h2>
              <button
                className="btn sm"
                onClick={() => {
                  addIdeas(r.playbook.map((p) => ({ format: p.format, title: p.title, angle: p.rationale, hook: p.exampleHook, slides: p.format === "slideshow" ? [p.exampleHook] : [], demoLabel: "", caption: "", hashtags: "" })));
                  toast(`${r.playbook.length} plays added to Ideas`, "ok");
                }}
              >
                Add all to Ideas
              </button>
            </div>
            <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {r.playbook.map((p, i) => (
                <article key={i} className="card" style={{ alignContent: "start" }}>
                  <div className="row">
                    <span className="chip accent">{FORMAT_LABELS[p.format]}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p style={{ fontWeight: 600 }}>{p.exampleHook}</p>
                  <p className="small muted">{p.hookTemplate}</p>
                  <p className="small">{p.rationale}</p>
                  <div className="row" style={{ marginTop: "auto" }}>
                    <button
                      className="btn primary sm"
                      onClick={() => {
                        const post = postFromIdea(
                          { format: p.format, title: p.title, angle: p.rationale, hook: p.exampleHook, slides: p.format === "slideshow" ? [p.exampleHook] : [], demoLabel: "", caption: "", hashtags: "" },
                          settings.defaultStyle,
                        );
                        addPosts([post]);
                        router.push(`/studio/create?id=${post.id}`);
                      }}
                    >
                      Create post
                    </button>
                    <button className="btn sm" onClick={() => writeHooks(`p${i}`, p.hookTemplate)} disabled={busy !== null}>
                      {busy === `p${i}` ? <span className="spin" /> : <Sparkles />} More hooks
                    </button>
                  </div>
                  {hooks[`p${i}`] && (
                    <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                      {hooks[`p${i}`].map((hk) => (
                        <li key={hk}>{hk}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function CompetitorsPage() {
  const { competitors, addCompetitor } = useStore();
  const [tab, setTab] = useState<"swipe" | "patterns">("swipe");
  const [sel, setSel] = useState<string | null>(competitors[0]?.id ?? null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const current = competitors.find((c) => c.id === sel) ?? competitors[0];
  const total = useMemo(() => competitors.reduce((n, c) => n + c.ads.length, 0), [competitors]);

  const add = () => {
    if (!name.trim()) return;
    const id = addCompetitor({ name: name.trim(), url: url.trim() });
    setSel(id);
    setName("");
    setUrl("");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Competitors</h1>
          <p className="hint">Collect your competitors&apos; ads into a swipe file, then let AI find the hooks, angles and formats that work in your category, and the gaps nobody covers.</p>
        </div>
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={tab === "swipe"} onClick={() => setTab("swipe")}>
            <Search /> Swipe file {total || ""}
          </button>
          <button aria-pressed={tab === "patterns"} onClick={() => setTab("patterns")}>
            <Wand2 /> Patterns
          </button>
        </div>
      </div>
      <AiBanner />
      <BrandHint />

      {tab === "patterns" ? (
        <Patterns />
      ) : (
        <div className="split">
          <aside className="stack" style={{ alignContent: "start" }}>
            <div className="list">
              {competitors.map((c) => (
                <button
                  key={c.id}
                  className="item"
                  style={{ gridTemplateColumns: "minmax(0,1fr) auto", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", borderColor: c.id === current?.id ? "var(--accent)" : undefined, background: c.id === current?.id ? "var(--accent-soft)" : undefined }}
                  onClick={() => setSel(c.id)}
                  aria-current={c.id === current?.id ? "true" : undefined}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="t" style={{ display: "block" }}>
                      {c.name}
                    </span>
                    <span className="m" style={{ display: "block" }}>
                      {c.url.replace(/^https?:\/\//, "") || "No website"}
                    </span>
                  </span>
                  <span className="chip">{c.ads.length}</span>
                </button>
              ))}
            </div>
            <form
              className="card flat"
              style={{ padding: 14 }}
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <span className="label">Add a competitor</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Competitor name" />
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Website (optional)" aria-label="Competitor website" />
              <button className="btn" type="submit" disabled={!name.trim()}>
                <Plus /> Add competitor
              </button>
            </form>
          </aside>
          <div style={{ minWidth: 0 }}>
            {current ? (
              <CompetitorDetail key={current.id} c={current} />
            ) : (
              <div className="empty">
                <h3>Who are you up against?</h3>
                <p>Add 2–5 competitors whose customers you want. Their ads show you what your audience already responds to.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
