"use client";
import { Download, FileUp, Plus, Sparkles, Video, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AiBanner } from "@/components/AiBanner";
import { MediaPicker, MediaThumb } from "@/components/MediaPicker";
import { PhonePreview } from "@/components/PhonePreview";
import { StyleControls } from "@/components/StyleControls";
import { api } from "@/lib/api";
import { postToComposition } from "@/lib/compose";
import { type CsvPost, parsePostsCSV, toCSV } from "@/lib/csv";
import { canRecord } from "@/lib/render/record";
import { downloadBundle, renderPost } from "@/lib/renderPost";
import { FORMAT_LABELS, type Format } from "@/lib/schemas";
import { newPost, useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Background, Post, TextStyle } from "@/lib/types";

const SAMPLE = `overlay,caption,hashtags
"Nobody told me planning my week could take 5 minutes 😭",,
"POV: you finally stopped forgetting assignment deadlines",,
"3 things I wish I knew before my first semester",,
"Me acting normal after finding the best study hack","Okay but why did nobody tell me about this sooner? Link in bio 👀","#studytok #collegelife #productivity #studentlife"`;

const BATCH_FORMATS: Format[] = ["hook_video", "hook_demo", "meme"];
const DRAFT_KEY = "reelforge.batch.csv";

export default function BatchPage() {
  const { brand, settings, addPosts, media } = useStore();
  const [csv, setCsv] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) ?? SAMPLE;
    } catch {
      return SAMPLE;
    }
  });
  const [format, setFormat] = useState<Format>("hook_video");
  const [clipIds, setClipIds] = useState<string[]>([]);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [style, setStyle] = useState<TextStyle>(settings.defaultStyle);
  const [background, setBackground] = useState<Background>("sunset");
  const [duration, setDuration] = useState(7);
  const [sel, setSel] = useState(0);
  const [picker, setPicker] = useState<null | "clips" | "demo" | "audio">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState({ i: 0, n: 0, p: 0 });
  const [made, setMade] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cancel = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, csv);
    } catch {}
  }, [csv]);

  // Default the clip pool to every hook clip in the library.
  useEffect(() => {
    if (!clipIds.length) setClipIds(media.filter((m) => m.kind === "video" && m.role === "hook").map((m) => m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => parsePostsCSV(csv), [csv]);
  const missing = rows.filter((r) => !r.caption || !r.hashtags).length;
  const writeRows = (r: CsvPost[]) => setCsv(toCSV(["overlay", "caption", "hashtags"], r.map((x) => [x.overlay, x.caption, x.hashtags])));

  const buildPost = (r: CsvPost, i: number): Post => {
    const [top, bottom] = format === "meme" ? r.overlay.split(/\s*\|\s*/) : [r.overlay, ""];
    return newPost(
      format,
      {
        hook: top,
        bottomText: bottom ?? "",
        caption: r.caption,
        hashtags: r.hashtags,
        style,
        background,
        duration: format === "hook_demo" ? Math.max(duration, 5) : duration,
        mediaIds: clipIds.length ? [clipIds[i % clipIds.length]] : [],
        demoMediaId: demoId,
        audioId,
      },
      style,
    );
  };

  const previewPost = useMemo(
    () => (rows[sel] ? buildPost(rows[sel], sel) : buildPost({ overlay: "Add a row of overlay text", caption: "", hashtags: "" }, 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sel, format, style, background, duration, clipIds, demoId, audioId],
  );
  const comp = useMemo(() => postToComposition(previewPost), [previewPost]);

  const fillCaptions = async () => {
    const todo = rows.map((r, i) => ({ id: String(i), text: r.overlay, caption: r.caption, hashtags: r.hashtags, format })).filter((r) => !r.caption || !r.hashtags);
    if (!todo.length) return toast("Every row already has a caption and hashtags.", "ok");
    setBusy("captions");
    try {
      const res = await api<{ items: { id: string; caption: string; hashtags: string }[] }>("captions", { brand, posts: todo });
      const next = rows.map((r) => ({ ...r }));
      let n = 0;
      for (const it of res.items) {
        const r = next[Number(it.id)];
        if (!r) continue;
        if (!r.caption && it.caption) (r.caption = it.caption.trim()), n++;
        if (!r.hashtags && it.hashtags) r.hashtags = it.hashtags.trim();
      }
      writeRows(next);
      toast(`Wrote captions for ${n} row${n === 1 ? "" : "s"}`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't write captions", "err");
    } finally {
      setBusy(null);
    }
  };

  const moreHooks = async () => {
    setBusy("hooks");
    try {
      const res = await api<{ hooks: string[] }>("hooks", { brand, count: 8, language: settings.language, avoid: rows.map((r) => r.overlay) });
      writeRows([...rows, ...res.hooks.map((h) => ({ overlay: h, caption: "", hashtags: "" }))]);
      toast(`Added ${res.hooks.length} hooks. Press "Write missing captions" to finish them.`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't suggest hooks", "err");
    } finally {
      setBusy(null);
    }
  };

  const create = async (render: boolean) => {
    if (!rows.length) return toast("Add at least one row of overlay text.", "err");
    if (render && !canRecord()) return toast("This browser can't record video. Use Chrome, Edge or Safari.", "err");
    const posts = rows.map(buildPost).reverse();
    addPosts(posts);
    const ordered = [...posts].reverse();
    setMade(ordered.map((p) => p.id));
    if (!render) return toast(`${posts.length} drafts added to Posts`, "ok");
    cancel.current = new AbortController();
    setBusy("render");
    let ok = 0;
    for (let i = 0; i < ordered.length; i++) {
      if (cancel.current.signal.aborted) break;
      setProgress({ i, n: ordered.length, p: 0 });
      try {
        await renderPost(ordered[i], { signal: cancel.current.signal, onProgress: (p) => setProgress({ i, n: ordered.length, p }) });
        ok++;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") break;
        toast(`Post ${i + 1} failed: ${e instanceof Error ? e.message : "unknown error"}. Continuing.`, "err");
      }
    }
    setBusy(null);
    cancel.current = null;
    toast(`${ok} of ${ordered.length} videos rendered`, ok === ordered.length ? "ok" : "info");
  };

  const madePosts = useStore(useShallow((s) => made.map((id) => s.posts.find((p) => p.id === id)).filter(Boolean) as Post[]));

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Batch</h1>
          <p className="hint">Make dozens of posts at once from a list of hooks. Each row becomes a video on the next clip in your pool.</p>
        </div>
      </div>
      <AiBanner />

      <div className="editor">
        <div className="stack lg">
          <section className="card">
            <div className="card-head">
              <span className="num">1</span>
              <h2>Format and clips</h2>
            </div>
            <div className="seg" role="group" aria-label="Format">
              {BATCH_FORMATS.map((f) => (
                <button key={f} aria-pressed={format === f} onClick={() => setFormat(f)}>
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
            {format === "meme" && <p className="hint">For memes, split top and bottom text with a pipe: <code>top text | bottom text</code></p>}
            <div className="field">
              <span className="label">Clip pool · {clipIds.length} clip{clipIds.length === 1 ? "" : "s"}, used in rotation</span>
              <div className="thumbs">
                {clipIds.map((id, i) => (
                  <MediaThumb key={id + i} id={id} onRemove={() => setClipIds((c) => c.filter((_, j) => j !== i))} />
                ))}
                <button className="thumb add" onClick={() => setPicker("clips")}>
                  <Plus />
                  Add clips
                </button>
              </div>
              {!clipIds.length && <p className="note">No clips: posts use a gradient background. Selfie-style vertical clips work best.</p>}
            </div>
            {format === "hook_demo" && (
              <div className="field">
                <span className="label">Demo clip (same for every post)</span>
                <div style={{ width: 84 }}>
                  {demoId ? (
                    <MediaThumb id={demoId} onRemove={() => setDemoId(null)} />
                  ) : (
                    <button className="thumb add" style={{ width: 84 }} onClick={() => setPicker("demo")}>
                      <Plus />
                      Choose
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="row">
              {audioId ? (
                <>
                  <span className="chip accent">♪ {media.find((m) => m.id === audioId)?.name}</span>
                  <button className="btn sm ghost" onClick={() => setAudioId(null)}>
                    Remove
                  </button>
                </>
              ) : (
                <button className="btn sm" onClick={() => setPicker("audio")}>
                  Add a music track (optional)
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <span className="num">2</span>
              <h2>Hooks</h2>
              <span className="spacer" />
              <span className="muted small">
                {rows.length} rows{missing ? `, ${missing} missing captions` : ""}
              </span>
            </div>
            <p className="hint">
              Columns: <code>overlay, caption, hashtags</code>. Leave caption or hashtags empty and AI fills them.
            </p>
            <div className="row">
              <button className="btn sm" onClick={() => fileRef.current?.click()}>
                <FileUp /> Upload CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".csv,text/csv,text/plain"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsv(await f.text());
                  e.target.value = "";
                  setSel(0);
                }}
              />
              <button className="btn sm" onClick={moreHooks} disabled={busy !== null}>
                {busy === "hooks" ? <span className="spin" /> : <Sparkles />} Suggest 8 hooks
              </button>
              <button className="btn sm primary" onClick={fillCaptions} disabled={busy !== null || !rows.length}>
                {busy === "captions" ? <span className="spin" /> : <Sparkles />} Write missing captions
              </button>
            </div>
            <textarea className="mono" value={csv} onChange={(e) => setCsv(e.target.value)} spellCheck={false} rows={8} aria-label="Posts CSV" />
            <div className="list" style={{ maxHeight: 300, overflowY: "auto" }}>
              {rows.map((r, i) => (
                <button key={i} className="item" style={{ gridTemplateColumns: "28px minmax(0,1fr)", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", borderColor: i === sel ? "var(--accent)" : undefined, background: i === sel ? "var(--accent-soft)" : undefined }} onClick={() => setSel(i)}>
                  <span className="mono small muted">{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="t" style={{ display: "block", whiteSpace: "normal" }}>
                      {r.overlay}
                    </span>
                    <span className="m" style={{ display: "block", color: !r.caption || !r.hashtags ? "var(--warn)" : undefined }}>
                      {r.caption || r.hashtags ? [r.caption, r.hashtags].filter(Boolean).join(" · ") : "Needs caption and hashtags"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <span className="num">3</span>
              <h2>Style</h2>
            </div>
            <StyleControls style={style} onChange={setStyle} background={background} onBackground={setBackground} />
            <label className="field" style={{ maxWidth: 320 }}>
              <span className="label">Length · {duration}s</span>
              <input type="range" min={3} max={30} value={duration} onChange={(e) => setDuration(+e.target.value)} />
            </label>
          </section>

          <section className="card">
            <div className="card-head">
              <span className="num">4</span>
              <h2>Create</h2>
            </div>
            <div className="row">
              {busy === "render" ? (
                <button className="btn" onClick={() => cancel.current?.abort()}>
                  <X /> Stop
                </button>
              ) : (
                <button className="btn primary" onClick={() => create(true)} disabled={busy !== null || !rows.length}>
                  <Video /> Create and render {rows.length}
                </button>
              )}
              <button className="btn" onClick={() => create(false)} disabled={busy !== null || !rows.length}>
                Save {rows.length} as drafts
              </button>
              {madePosts.some((p) => p.renderId) && busy !== "render" && (
                <button
                  className="btn"
                  onClick={async () => {
                    setBusy("zip");
                    try {
                      const n = await downloadBundle(madePosts);
                      toast(`Zipped ${n} videos with captions.csv`, "ok");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === "zip" ? <span className="spin" /> : <Download />} Download all (ZIP)
                </button>
              )}
            </div>
            {busy === "render" && (
              <>
                <div className="bar" aria-hidden="true">
                  <i style={{ width: `${((progress.i + progress.p) / Math.max(1, progress.n)) * 100}%` }} />
                </div>
                <p className="status">
                  Rendering {progress.i + 1} of {progress.n}… Videos record in real time, so keep this tab in front.
                </p>
              </>
            )}
            {madePosts.length > 0 && busy !== "render" && (
              <p className="status ok">
                {madePosts.filter((p) => p.renderId).length} of {madePosts.length} rendered. Find them in <Link href="/studio/posts">Posts</Link> or{" "}
                <Link href="/studio/calendar">schedule them</Link>.
              </p>
            )}
          </section>
        </div>

        <aside className="preview-col" aria-label="Preview">
          <PhonePreview comp={comp} caption={rows[sel] ? [rows[sel].caption, rows[sel].hashtags].filter(Boolean).join(" ") : ""} />
          <div className="pnav">
            <button className="btn sm" onClick={() => rows.length && setSel((s) => (s - 1 + rows.length) % rows.length)} aria-label="Previous row">
              ‹
            </button>
            <span>{rows.length ? `${sel + 1} / ${rows.length}` : "0 / 0"}</span>
            <button className="btn sm" onClick={() => rows.length && setSel((s) => (s + 1) % rows.length)} aria-label="Next row">
              ›
            </button>
          </div>
        </aside>
      </div>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        kinds={picker === "audio" ? ["audio"] : ["video", "image"]}
        role={picker === "demo" ? "demo" : picker === "audio" ? "music" : "hook"}
        multiple={picker === "clips"}
        title={picker === "clips" ? "Add clips to the pool" : picker === "demo" ? "Choose a demo clip" : "Choose a track"}
        onPick={(ids) => {
          if (picker === "clips") setClipIds((c) => [...c, ...ids.filter((x) => !c.includes(x))]);
          if (picker === "demo") setDemoId(ids[0]);
          if (picker === "audio") setAudioId(ids[0]);
        }}
      />
    </div>
  );
}
