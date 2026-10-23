"use client";
import { CalendarPlus, CheckCircle2, Copy, Download, Pencil, Plus, Trash2, Video, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MediaThumb } from "@/components/MediaPicker";
import { postText, STATUS_LABELS, statusChip } from "@/lib/compose";
import { blobUrl } from "@/lib/media";
import { bgCss } from "@/lib/render/engine";
import { canRecord } from "@/lib/render/record";
import { downloadBundle, downloadRender, renderPost } from "@/lib/renderPost";
import { FORMAT_LABELS, FORMATS, type Format } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Post, PostStatus } from "@/lib/types";

const STATUSES: PostStatus[] = ["draft", "rendered", "scheduled", "posted"];

function Cover({ post }: { post: Post }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (post.renderId) blobUrl(post.renderId).then(setUrl);
    else setUrl(null);
  }, [post.renderId]);
  if (url) return <video src={url} muted loop playsInline controls preload="metadata" aria-label={`Rendered video: ${postText(post)}`} />;
  if (post.mediaIds[0]) return <MediaThumb id={post.mediaIds[0]} />;
  return (
    <div style={{ width: "100%", height: "100%", background: bgCss(post.background), display: "grid", placeItems: "center", padding: 14, color: "#fff", font: "800 15px/1.2 Montserrat, sans-serif", textAlign: "center" }}>
      {postText(post).slice(0, 90)}
    </div>
  );
}

export default function PostsPage() {
  const { posts, updatePost, removePost, duplicatePost } = useStore();
  const [status, setStatus] = useState<PostStatus | "all">("all");
  const [format, setFormat] = useState<Format | "all">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const cancel = useRef<AbortController | null>(null);

  const shown = posts.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (format === "all" || p.format === format) &&
      (!q || `${p.title} ${postText(p)} ${p.caption} ${p.hashtags}`.toLowerCase().includes(q.toLowerCase())),
  );
  const unrendered = shown.filter((p) => !p.renderId);

  const renderAll = async () => {
    if (!canRecord()) return toast("This browser can't record video. Use Chrome, Edge or Safari.", "err");
    cancel.current = new AbortController();
    setBusy("all");
    let ok = 0;
    for (const [i, p] of unrendered.entries()) {
      if (cancel.current.signal.aborted) break;
      setProgress(`Rendering ${i + 1} of ${unrendered.length}…`);
      try {
        await renderPost(p, { signal: cancel.current.signal });
        ok++;
      } catch (e) {
        if ((e as Error).name === "AbortError") break;
        toast(`"${postText(p).slice(0, 40)}" failed: ${(e as Error).message}`, "err");
      }
    }
    setBusy(null);
    setProgress("");
    toast(`${ok} video${ok === 1 ? "" : "s"} rendered`, "ok");
  };

  const renderOne = async (p: Post) => {
    if (!canRecord()) return toast("This browser can't record video.", "err");
    setBusy(p.id);
    try {
      await renderPost(p);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Posts</h1>
          <p className="hint">Every draft, rendered video and scheduled post.</p>
        </div>
        <div className="row">
          {busy === "all" ? (
            <button className="btn" onClick={() => cancel.current?.abort()}>
              <X /> Stop
            </button>
          ) : (
            <button className="btn" onClick={renderAll} disabled={!unrendered.length || busy !== null}>
              <Video /> Render {unrendered.length} unrendered
            </button>
          )}
          <button
            className="btn"
            disabled={!shown.some((p) => p.renderId) || busy !== null}
            onClick={async () => {
              setBusy("zip");
              try {
                const n = await downloadBundle(shown);
                toast(`Zipped ${n} videos`, "ok");
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "zip" ? <span className="spin" /> : <Download />} Download ZIP
          </button>
          <Link className="btn primary" href="/studio/create">
            <Plus /> New post
          </Link>
        </div>
      </div>
      {progress && <p className="status">{progress} Keep this tab in front.</p>}

      <div className="row between">
        <div className="row">
          <div className="seg" role="group" aria-label="Status">
            <button aria-pressed={status === "all"} onClick={() => setStatus("all")}>
              All {posts.length}
            </button>
            {STATUSES.map((s) => (
              <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>
                {STATUS_LABELS[s]} {posts.filter((p) => p.status === s).length}
              </button>
            ))}
          </div>
          <select value={format} onChange={(e) => setFormat(e.target.value as Format | "all")} style={{ width: "auto" }} aria-label="Format">
            <option value="all">All formats</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <input type="text" placeholder="Search posts" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} aria-label="Search posts" />
      </div>

      {shown.length ? (
        <div className="tiles">
          {shown.map((p) => (
            <article key={p.id} className="tile">
              <div className="media">
                <Cover post={p} />
                <span className={`chip badge ${statusChip(p.status)}`}>{STATUS_LABELS[p.status]}</span>
              </div>
              <div className="body">
                <div className="row">
                  <span className="chip">{FORMAT_LABELS[p.format]}</span>
                  {p.scheduledAt && <span className="small muted">{new Date(p.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>}
                </div>
                <div className="hookline">{p.title || postText(p) || "Untitled"}</div>
                <div className="row" style={{ gap: 4 }}>
                  <Link className="btn icon sm" href={`/studio/create?id=${p.id}`} aria-label="Edit" title="Edit">
                    <Pencil />
                  </Link>
                  {p.renderId ? (
                    <button className="btn icon sm" onClick={() => downloadRender(p)} aria-label="Download" title="Download video">
                      <Download />
                    </button>
                  ) : (
                    <button className="btn icon sm" onClick={() => renderOne(p)} disabled={busy !== null} aria-label="Render" title="Render video">
                      {busy === p.id ? <span className="spin" /> : <Video />}
                    </button>
                  )}
                  <Link className="btn icon sm" href={`/studio/calendar?schedule=${p.id}`} aria-label="Schedule" title="Schedule">
                    <CalendarPlus />
                  </Link>
                  <button
                    className="btn icon sm"
                    onClick={() => navigator.clipboard.writeText([p.caption, p.hashtags].filter(Boolean).join("\n\n")).then(() => toast("Caption copied", "ok"))}
                    aria-label="Copy caption"
                    title="Copy caption"
                  >
                    <Copy />
                  </button>
                  {p.status !== "posted" && (
                    <button className="btn icon sm" onClick={() => updatePost(p.id, { status: "posted", scheduledAt: p.scheduledAt ?? new Date().toISOString() })} aria-label="Mark as posted" title="Mark as posted">
                      <CheckCircle2 />
                    </button>
                  )}
                  <span className="spacer" />
                  <button className="btn icon sm ghost" onClick={() => duplicatePost(p.id)} aria-label="Duplicate" title="Duplicate">
                    <Plus />
                  </button>
                  <button className="btn icon sm ghost danger" onClick={() => confirm("Delete this post?") && removePost(p.id)} aria-label="Delete" title="Delete">
                    <Trash2 />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>{posts.length ? "No posts match" : "No posts yet"}</h3>
          <p>Create one from scratch, from an idea, or a whole batch from a list of hooks.</p>
          <div className="row">
            <Link className="btn primary" href="/studio/create">
              New post
            </Link>
            <Link className="btn" href="/studio/batch">
              Batch create
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
