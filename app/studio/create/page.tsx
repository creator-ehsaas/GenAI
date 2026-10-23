"use client";
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Copy,
  Download,
  Film,
  Images,
  Music,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  Video,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AiBanner } from "@/components/AiBanner";
import { MediaPicker, MediaThumb } from "@/components/MediaPicker";
import { PhonePreview } from "@/components/PhonePreview";
import { StyleControls } from "@/components/StyleControls";
import { api } from "@/lib/api";
import { postText, postToComposition, STATUS_LABELS } from "@/lib/compose";
import { blobUrl } from "@/lib/media";
import { canRecord } from "@/lib/render/record";
import { downloadRender, downloadSlides, renderPost } from "@/lib/renderPost";
import { FORMAT_BLURBS, FORMAT_LABELS, FORMATS, type Format } from "@/lib/schemas";
import { newPost, useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { MediaKind, MediaRole, Post } from "@/lib/types";

const FORMAT_ICONS: Record<Format, typeof Video> = { hook_video: Video, hook_demo: Film, slideshow: Images, meme: Sparkles };

function NewPostPicker() {
  const router = useRouter();
  const { addPosts, settings, posts } = useStore();
  const start = (f: Format) => {
    const p = newPost(f, {}, settings.defaultStyle);
    addPosts([p]);
    router.replace(`/studio/create?id=${p.id}`);
  };
  const recent = posts.filter((p) => p.status === "draft").slice(0, 6);
  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Create</h1>
          <p className="hint">Pick a format to start a new post, or open a draft.</p>
        </div>
      </div>
      <div className="grid4">
        {FORMATS.map((f) => {
          const Icon = FORMAT_ICONS[f];
          return (
            <button key={f} className="card" style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => start(f)}>
              <span className="logo" style={{ width: 38, height: 38 }}>
                <Icon />
              </span>
              <h3>{FORMAT_LABELS[f]}</h3>
              <p className="small muted">{FORMAT_BLURBS[f]}</p>
            </button>
          );
        })}
      </div>
      {recent.length > 0 && (
        <section className="stack">
          <h2>Recent drafts</h2>
          <div className="list">
            {recent.map((p) => (
              <Link key={p.id} href={`/studio/create?id=${p.id}`} className="item" style={{ textDecoration: "none" }}>
                <span className="chip accent">{FORMAT_LABELS[p.format]}</span>
                <span className="t">{postText(p) || "Untitled"}</span>
                <span className="m">{new Date(p.updatedAt).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RenderedVideo({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    blobUrl(id).then(setUrl);
  }, [id]);
  return url ? <video src={url} controls playsInline loop muted style={{ width: "100%", borderRadius: 10, aspectRatio: "9/16", background: "#000", maxHeight: 420 }} /> : null;
}

function Editor({ post }: { post: Post }) {
  const router = useRouter();
  const { updatePost, removePost, duplicatePost, media, brand, settings } = useStore();
  const set = (patch: Partial<Post>) => updatePost(post.id, patch);
  const [picker, setPicker] = useState<null | { target: "hook" | "demo" | "slides" | "audio"; kinds: MediaKind[]; role: MediaRole; multiple: boolean; title: string }>(null);
  const [hookIdeas, setHookIdeas] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [topic, setTopic] = useState("");
  const abort = useRef<AbortController | null>(null);

  const comp = useMemo(() => postToComposition(post), [post]);
  const hookClips = media.filter((m) => m.kind === "video" && m.role === "hook");
  const anyVideo = media.filter((m) => m.kind === "video");

  const shuffleClip = () => {
    const pool = hookClips.length ? hookClips : anyVideo;
    if (!pool.length) return toast("Upload a clip in Media first.", "err");
    const pick = pool[Math.floor(Math.random() * pool.length)];
    set({ mediaIds: [pick.id] });
  };

  const suggestHooks = async () => {
    setBusy("hooks");
    try {
      const r = await api<{ hooks: string[] }>("hooks", { brand, count: 6, language: settings.language, avoid: [post.hook].filter(Boolean) });
      setHookIdeas(r.hooks);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't get hooks", "err");
    } finally {
      setBusy(null);
    }
  };

  const writeCaption = async () => {
    setBusy("caption");
    try {
      const r = await api<{ items: { id: string; caption: string; hashtags: string }[] }>("captions", {
        brand,
        posts: [{ id: post.id, format: post.format, text: postText(post) }],
      });
      const it = r.items[0];
      if (it) set({ caption: it.caption, hashtags: it.hashtags });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't write a caption", "err");
    } finally {
      setBusy(null);
    }
  };

  const writeSlideshow = async () => {
    const t = topic.trim() || post.hook.trim();
    if (!t) return toast("Give the slideshow a topic first.", "err");
    setBusy("slides");
    try {
      const r = await api<{ slides: string[]; caption: string; hashtags: string }>("slideshow", {
        brand,
        topic: t,
        slides: Math.max(4, Math.min(7, post.slides.length || 5)),
        language: settings.language,
      });
      set({ slides: r.slides, hook: r.slides[0] ?? post.hook, caption: r.caption, hashtags: r.hashtags });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't write slides", "err");
    } finally {
      setBusy(null);
    }
  };

  const render = async () => {
    if (!canRecord()) return toast("This browser can't record video. Use Chrome, Edge or Safari.", "err");
    abort.current = new AbortController();
    setBusy("render");
    setProgress(0);
    try {
      const r = await renderPost(post, { onProgress: setProgress, signal: abort.current.signal });
      toast(r.ext === "webm" ? "Rendered as WebM. Chrome on desktop records MP4, which every platform accepts." : "Video ready", r.ext === "webm" ? "info" : "ok");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast(e instanceof Error ? e.message : "Render failed", "err");
    } finally {
      setBusy(null);
      abort.current = null;
    }
  };

  const textMissing = post.format === "slideshow" ? !post.slides.some((s) => s.trim()) : !post.hook.trim();

  const pick = (ids: string[]) => {
    if (!picker) return;
    if (picker.target === "hook") set({ mediaIds: [ids[0]] });
    if (picker.target === "demo") set({ demoMediaId: ids[0] });
    if (picker.target === "audio") set({ audioId: ids[0] });
    if (picker.target === "slides") set({ mediaIds: [...post.mediaIds, ...ids] });
  };

  const moveSlide = (i: number, d: number) => {
    const s = [...post.slides];
    const j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    set({ slides: s });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <input
            type="text"
            value={post.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Untitled post"
            aria-label="Post title"
            style={{ font: "800 1.625rem/1.1 var(--display)", background: "transparent", border: "1px solid transparent", padding: "2px 4px", marginLeft: -5 }}
          />
          <div className="row">
            <span className="chip accent">{FORMAT_LABELS[post.format]}</span>
            <span className={`chip ${post.status === "posted" ? "ok" : post.status === "scheduled" ? "warn" : ""}`}>{STATUS_LABELS[post.status]}</span>
          </div>
        </div>
        <div className="row">
          <button
            className="btn sm"
            onClick={() => {
              const id = duplicatePost(post.id);
              if (id) router.push(`/studio/create?id=${id}`);
            }}
          >
            <Copy /> Duplicate
          </button>
          <button
            className="btn sm danger"
            onClick={() => {
              if (!confirm("Delete this post?")) return;
              removePost(post.id);
              router.replace("/studio/posts");
            }}
          >
            <Trash2 /> Delete
          </button>
        </div>
      </div>
      <AiBanner />

      <div className="editor">
        <div className="stack lg">
          <section className="card">
            <div className="seg" role="group" aria-label="Format">
              {FORMATS.map((f) => {
                const Icon = FORMAT_ICONS[f];
                return (
                  <button
                    key={f}
                    aria-pressed={post.format === f}
                    onClick={() =>
                      set({
                        format: f,
                        slides: f === "slideshow" && !post.slides.length ? [post.hook, "", "", ""] : post.slides,
                        duration: f === "hook_demo" && post.duration < 6 ? 10 : post.duration,
                      })
                    }
                  >
                    <Icon /> {FORMAT_LABELS[f]}
                  </button>
                );
              })}
            </div>
            <p className="hint">{FORMAT_BLURBS[post.format]}</p>
          </section>

          {/* ---------- text ---------- */}
          <section className="card">
            <div className="card-head">
              <span className="num">1</span>
              <h2>On-screen text</h2>
            </div>
            {post.format === "slideshow" ? (
              <>
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic, e.g. 5 study habits that actually work" />
                  <button className="btn" onClick={writeSlideshow} disabled={busy === "slides"}>
                    {busy === "slides" ? <span className="spin" /> : <Wand2 />} Write slides
                  </button>
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {post.slides.map((s, i) => (
                    <div key={i} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                      <span className="num" style={{ marginTop: 8 }}>
                        {i + 1}
                      </span>
                      <textarea
                        value={s}
                        rows={2}
                        style={{ minHeight: 56 }}
                        placeholder={i === 0 ? "Hook slide" : `Slide ${i + 1}`}
                        onChange={(e) => {
                          const slides = [...post.slides];
                          slides[i] = e.target.value;
                          set({ slides, hook: i === 0 ? e.target.value : post.hook });
                        }}
                      />
                      <div style={{ display: "grid", gap: 2 }}>
                        <button className="btn icon ghost sm" onClick={() => moveSlide(i, -1)} aria-label="Move up" disabled={i === 0}>
                          <ArrowUp />
                        </button>
                        <button className="btn icon ghost sm" onClick={() => moveSlide(i, 1)} aria-label="Move down" disabled={i === post.slides.length - 1}>
                          <ArrowDown />
                        </button>
                        <button className="btn icon ghost sm" onClick={() => set({ slides: post.slides.filter((_, j) => j !== i) })} aria-label="Remove slide">
                          <X />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn sm" style={{ justifySelf: "start" }} onClick={() => set({ slides: [...post.slides, ""] })} disabled={post.slides.length >= 10}>
                  <Plus /> Add slide
                </button>
              </>
            ) : (
              <>
                <label className="field">
                  <span className="label">{post.format === "meme" ? "Top text" : "Hook"}</span>
                  <textarea value={post.hook} rows={2} onChange={(e) => set({ hook: e.target.value })} placeholder="POV: you finally found an app that…" />
                </label>
                {post.format === "meme" && (
                  <label className="field">
                    <span className="label">Bottom text</span>
                    <input type="text" value={post.bottomText} onChange={(e) => set({ bottomText: e.target.value })} />
                  </label>
                )}
                {post.format === "hook_demo" && (
                  <label className="field">
                    <span className="label">Label over the demo (optional)</span>
                    <input type="text" value={post.demoLabel} onChange={(e) => set({ demoLabel: e.target.value })} placeholder="e.g. it does this in 2 taps" />
                  </label>
                )}
                <div className="row">
                  <button className="btn sm" onClick={suggestHooks} disabled={busy === "hooks"}>
                    {busy === "hooks" ? <span className="spin" /> : <Sparkles />} Suggest hooks
                  </button>
                </div>
                {hookIdeas.length > 0 && (
                  <div className="row" style={{ gap: 6 }}>
                    {hookIdeas.map((h) => (
                      <button key={h} className="chip" style={{ whiteSpace: "normal", textAlign: "left" }} onClick={() => set({ hook: h })}>
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ---------- media ---------- */}
          <section className="card">
            <div className="card-head">
              <span className="num">2</span>
              <h2>Media</h2>
            </div>
            {post.format === "slideshow" ? (
              <div className="field">
                <span className="label">Slide backgrounds · images or clips, used in order</span>
                <div className="thumbs">
                  {post.mediaIds.map((id, i) => (
                    <MediaThumb key={id + i} id={id} label={`#${i + 1}`} onRemove={() => set({ mediaIds: post.mediaIds.filter((_, j) => j !== i) })} />
                  ))}
                  <button className="thumb add" onClick={() => setPicker({ target: "slides", kinds: ["image", "video"], role: "image", multiple: true, title: "Slide backgrounds" })}>
                    <Plus />
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid2">
                <div className="field">
                  <span className="label">{post.format === "hook_demo" ? "Hook clip (reaction)" : "Background clip"}</span>
                  <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                    <div style={{ width: 84 }}>
                      {post.mediaIds[0] ? (
                        <MediaThumb id={post.mediaIds[0]} onRemove={() => set({ mediaIds: [] })} />
                      ) : (
                        <button className="thumb add" style={{ width: 84 }} onClick={() => setPicker({ target: "hook", kinds: ["video", "image"], role: "hook", multiple: false, title: "Choose a clip" })}>
                          <Plus />
                          Choose
                        </button>
                      )}
                    </div>
                    <div className="stack" style={{ gap: 6 }}>
                      <button className="btn sm" onClick={() => setPicker({ target: "hook", kinds: ["video", "image"], role: "hook", multiple: false, title: "Choose a clip" })}>
                        <Video /> Choose
                      </button>
                      <button className="btn sm" onClick={shuffleClip}>
                        <Shuffle /> Random
                      </button>
                    </div>
                  </div>
                </div>
                {post.format === "hook_demo" && (
                  <div className="field">
                    <span className="label">Demo clip (screen recording)</span>
                    <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                      <div style={{ width: 84 }}>
                        {post.demoMediaId ? (
                          <MediaThumb id={post.demoMediaId} onRemove={() => set({ demoMediaId: null })} />
                        ) : (
                          <button className="thumb add" style={{ width: 84 }} onClick={() => setPicker({ target: "demo", kinds: ["video", "image"], role: "demo", multiple: false, title: "Choose a demo clip" })}>
                            <Plus />
                            Choose
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="field">
              <span className="label">Music (optional)</span>
              <div className="row">
                {post.audioId ? (
                  <>
                    <span className="chip accent">
                      <Music size={13} /> {media.find((m) => m.id === post.audioId)?.name ?? "track"}
                    </span>
                    <button className="btn sm ghost" onClick={() => set({ audioId: null })}>
                      Remove
                    </button>
                  </>
                ) : (
                  <button className="btn sm" onClick={() => setPicker({ target: "audio", kinds: ["audio"], role: "music", multiple: false, title: "Choose a track" })}>
                    <Music /> Add a track
                  </button>
                )}
              </div>
              <p className="note">Without a track the video is silent, so you can add a trending sound inside TikTok, Instagram or YouTube when you post. Only use music you have rights to.</p>
            </div>
            <div className="grid3">
              {post.format === "slideshow" ? (
                <label className="field">
                  <span className="label">Seconds per slide · {post.slideDuration}</span>
                  <input type="range" min={1.5} max={6} step={0.5} value={post.slideDuration} onChange={(e) => set({ slideDuration: +e.target.value })} />
                </label>
              ) : (
                <label className="field">
                  <span className="label">Length · {post.duration}s</span>
                  <input type="range" min={3} max={30} step={1} value={post.duration} onChange={(e) => set({ duration: +e.target.value })} />
                </label>
              )}
              {post.format === "hook_demo" && (
                <label className="field">
                  <span className="label">Hook part · {post.hookDuration}s</span>
                  <input type="range" min={1.5} max={6} step={0.5} value={post.hookDuration} onChange={(e) => set({ hookDuration: +e.target.value })} />
                </label>
              )}
            </div>
          </section>

          {/* ---------- style ---------- */}
          <section className="card">
            <div className="card-head">
              <span className="num">3</span>
              <h2>Style</h2>
            </div>
            <StyleControls style={post.style} onChange={(style) => set({ style })} background={post.background} onBackground={(background) => set({ background })} />
          </section>

          {/* ---------- caption ---------- */}
          <section className="card">
            <div className="card-head">
              <span className="num">4</span>
              <h2>Caption</h2>
              <span className="spacer" />
              <button className="btn sm" onClick={writeCaption} disabled={busy === "caption" || textMissing}>
                {busy === "caption" ? <span className="spin" /> : <Sparkles />} Write with AI
              </button>
            </div>
            <label className="field">
              <span className="label">Caption</span>
              <textarea value={post.caption} onChange={(e) => set({ caption: e.target.value })} rows={3} />
            </label>
            <label className="field">
              <span className="label">Hashtags</span>
              <input type="text" value={post.hashtags} onChange={(e) => set({ hashtags: e.target.value })} placeholder="#studytok #productivity" />
            </label>
            <div className="row">
              <button
                className="btn sm"
                onClick={() => navigator.clipboard.writeText([post.caption, post.hashtags].filter(Boolean).join("\n\n")).then(() => toast("Caption copied", "ok"))}
              >
                <Copy /> Copy caption
              </button>
            </div>
          </section>

          {/* ---------- export ---------- */}
          <section className="card">
            <div className="card-head">
              <span className="num">5</span>
              <h2>Render and export</h2>
            </div>
            <div className="row">
              {busy === "render" ? (
                <button className="btn" onClick={() => abort.current?.abort()}>
                  <X /> Cancel
                </button>
              ) : (
                <button className="btn primary" onClick={render} disabled={textMissing}>
                  <Video /> {post.renderId ? "Re-render video" : "Render video"}
                </button>
              )}
              {post.format === "slideshow" && (
                <button
                  className="btn"
                  disabled={busy !== null || textMissing}
                  onClick={async () => {
                    setBusy("png");
                    try {
                      await downloadSlides(post);
                    } catch (e) {
                      toast(e instanceof Error ? e.message : "Export failed", "err");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === "png" ? <span className="spin" /> : <Images />} Download slides (PNG)
                </button>
              )}
              {post.renderId && (
                <button className="btn" onClick={() => downloadRender(post)}>
                  <Download /> Download video
                </button>
              )}
              <Link className="btn" href={`/studio/calendar?schedule=${post.id}`}>
                <CalendarPlus /> Schedule
              </Link>
            </div>
            {busy === "render" && (
              <>
                <div className="bar" aria-hidden="true">
                  <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="status">Recording in real time ({Math.round(progress * 100)}%). Keep this tab in front.</p>
              </>
            )}
            {post.renderId && busy !== "render" && (
              <div style={{ maxWidth: 260 }}>
                <RenderedVideo id={post.renderId} />
                <p className="small muted">Rendered {post.renderedAt ? new Date(post.renderedAt).toLocaleString() : ""}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="preview-col" aria-label="Preview">
          <PhonePreview comp={comp} caption={[post.caption, post.hashtags].filter(Boolean).join(" ")} handle={(brand?.name || "yourbrand").toLowerCase().replace(/\s+/g, "")} />
          <p className="small muted" style={{ textAlign: "center" }}>
            Live preview · {comp.segments.reduce((s, x) => s + x.duration, 0).toFixed(1)}s
          </p>
        </aside>
      </div>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={pick}
        kinds={picker?.kinds ?? ["video"]}
        role={picker?.role}
        multiple={picker?.multiple}
        title={picker?.title}
      />
    </div>
  );
}

function CreateInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const post = useStore((s) => s.posts.find((p) => p.id === id));
  if (!id) return <NewPostPicker />;
  if (!post)
    return (
      <div className="page">
        <div className="empty">
          <h3>Post not found</h3>
          <Link className="btn" href="/studio/create">
            Start a new post
          </Link>
        </div>
      </div>
    );
  return <Editor post={post} />;
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreateInner />
    </Suspense>
  );
}
