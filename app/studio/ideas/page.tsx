"use client";
import { ArrowRight, Check, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiBanner, BrandHint } from "@/components/AiBanner";
import { api } from "@/lib/api";
import { FORMAT_LABELS, FORMATS, type Format, type Idea } from "@/lib/schemas";
import { postFromIdea, useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

export default function IdeasPage() {
  const router = useRouter();
  const { brand, ideas, addIdeas, removeIdea, updateIdea, clearIdeas, addPosts, settings, posts } = useStore();
  const [formats, setFormats] = useState<Format[]>([...FORMATS]);
  const [count, setCount] = useState(8);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Format | "all">("all");

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api<{ ideas: Idea[] }>("ideas", {
        brand,
        formats,
        count,
        focus: focus || undefined,
        language: settings.language,
        avoid: [...ideas.map((i) => i.hook), ...posts.map((p) => p.hook)].filter(Boolean),
      });
      addIdeas(r.ideas);
      toast(`${r.ideas.length} new ideas`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't generate ideas", "err");
    } finally {
      setBusy(false);
    }
  };

  const use = (id: string, go: boolean) => {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;
    const post = postFromIdea(idea, settings.defaultStyle);
    addPosts([post]);
    updateIdea(id, { used: true });
    if (go) router.push(`/studio/create?id=${post.id}`);
    else toast("Added to Posts as a draft", "ok");
  };

  const shown = ideas.filter((i) => filter === "all" || i.format === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Ideas</h1>
          <p className="hint">Content ideas written from your brand profile, each with a hook, angle and caption. Turn any of them into a post in one click.</p>
        </div>
      </div>
      <AiBanner />
      <BrandHint />

      <section className="card">
        <div className="field">
          <span className="label">Formats</span>
          <div className="row">
            {FORMATS.map((f) => (
              <button
                key={f}
                className="chip"
                aria-pressed={formats.includes(f)}
                onClick={() => setFormats((s) => (s.includes(f) ? (s.length > 1 ? s.filter((x) => x !== f) : s) : [...s, f]))}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid3">
          <label className="field" style={{ gridColumn: "span 2" }}>
            <span className="label">Focus (optional)</span>
            <input type="text" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. exam season, new dark-mode feature, parents as buyers" />
          </label>
          <label className="field">
            <span className="label">How many</span>
            <select value={count} onChange={(e) => setCount(+e.target.value)}>
              {[4, 8, 12, 16, 20].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <button className="btn primary" onClick={generate} disabled={busy}>
            {busy ? <span className="spin" /> : <Sparkles />} {busy ? "Thinking…" : "Generate ideas"}
          </button>
          <span className="muted small">Language: {settings.language}</span>
        </div>
      </section>

      {ideas.length > 0 && (
        <div className="row between">
          <div className="seg" role="group" aria-label="Filter ideas">
            <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
              All {ideas.length}
            </button>
            {FORMATS.map((f) => {
              const n = ideas.filter((i) => i.format === f).length;
              return n ? (
                <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {FORMAT_LABELS[f]} {n}
                </button>
              ) : null;
            })}
          </div>
          <div className="row">
            <button
              className="btn sm"
              onClick={() => {
                const fresh = shown.filter((i) => !i.used);
                addPosts(fresh.map((i) => postFromIdea(i, settings.defaultStyle)));
                fresh.forEach((i) => updateIdea(i.id, { used: true }));
                toast(`${fresh.length} drafts added to Posts`, "ok");
              }}
            >
              Add all unused to Posts
            </button>
            <button className="btn sm danger" onClick={() => confirm("Delete all ideas?") && clearIdeas()}>
              Clear
            </button>
          </div>
        </div>
      )}

      {shown.length ? (
        <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {shown.map((i) => (
            <article key={i.id} className="card" style={{ alignContent: "start" }}>
              <div className="row">
                <span className="chip accent">{FORMAT_LABELS[i.format]}</span>
                {i.used && (
                  <span className="chip ok">
                    <Check size={12} /> Used
                  </span>
                )}
                <span className="spacer" />
                <button className="btn icon ghost sm" onClick={() => removeIdea(i.id)} aria-label="Delete idea">
                  <Trash2 />
                </button>
              </div>
              <h3>{i.hook}</h3>
              {i.slides.length > 0 && (
                <ol className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                  {i.slides.map((s, k) => (
                    <li key={k}>{s}</li>
                  ))}
                </ol>
              )}
              <p className="small">
                <b>Angle:</b> <span className="muted">{i.angle}</span>
              </p>
              <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>
                {i.caption}
                {"\n"}
                <span style={{ color: "var(--accent)" }}>{i.hashtags}</span>
              </p>
              <div className="row" style={{ marginTop: "auto" }}>
                <button className="btn primary sm" onClick={() => use(i.id, true)}>
                  Create post <ArrowRight />
                </button>
                <button className="btn sm" onClick={() => use(i.id, false)}>
                  Save as draft
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>No ideas yet</h3>
          <p>Pick formats and press Generate. Ideas are saved in this browser.</p>
        </div>
      )}
    </div>
  );
}
