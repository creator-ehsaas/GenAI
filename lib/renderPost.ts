"use client";
import JSZip from "jszip";
import { postToComposition, slug } from "./compose";
import { deleteBlob, downloadBlob, getBlob, putBlob, uid } from "./media";
import { renderComposition, renderStills } from "./render/record";
import { useStore } from "./store";
import type { Post } from "./types";

export const fileBase = (p: Post, i?: number) => `${i != null ? String(i + 1).padStart(2, "0") + "-" : ""}${slug(p.title || p.hook || p.slides[0] || "post")}`;

/** Renders a post to video, stores it in IndexedDB and marks the post rendered. */
export async function renderPost(post: Post, opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {}) {
  const { settings, updatePost } = useStore.getState();
  const result = await renderComposition(postToComposition(post), { width: settings.resolution, ...opts });
  const id = uid();
  await putBlob(id, result.blob);
  if (post.renderId) await deleteBlob(post.renderId).catch(() => {});
  updatePost(post.id, {
    renderId: id,
    renderMime: result.mime,
    renderedAt: Date.now(),
    status: post.status === "draft" ? "rendered" : post.status,
  });
  return result;
}

export async function downloadRender(post: Post, i?: number) {
  if (!post.renderId) return false;
  const b = await getBlob(post.renderId);
  if (!b) return false;
  downloadBlob(b, `${fileBase(post, i)}.${b.type.includes("mp4") ? "mp4" : "webm"}`);
  return true;
}

export async function downloadSlides(post: Post) {
  const stills = await renderStills(postToComposition(post), 1080);
  const zip = new JSZip();
  stills.forEach((b, i) => zip.file(`${fileBase(post)}-slide-${i + 1}.png`, b));
  zip.file("caption.txt", [post.caption, post.hashtags].filter(Boolean).join("\n\n"));
  downloadBlob(await zip.generateAsync({ type: "blob" }), `${fileBase(post)}-slides.zip`);
}

export async function downloadBundle(posts: Post[]) {
  const zip = new JSZip();
  const rows: string[][] = [];
  for (const [i, p] of posts.entries()) {
    if (!p.renderId) continue;
    const b = await getBlob(p.renderId);
    if (!b) continue;
    const name = `${fileBase(p, i)}.${b.type.includes("mp4") ? "mp4" : "webm"}`;
    zip.file(name, b);
    rows.push([name, p.format, p.hook, p.caption, p.hashtags, p.scheduledAt ?? ""]);
  }
  const { toCSV } = await import("./csv");
  zip.file("captions.csv", toCSV(["file", "format", "hook", "caption", "hashtags", "scheduled_at"], rows));
  downloadBlob(await zip.generateAsync({ type: "blob" }), `reelforge-${new Date().toISOString().slice(0, 10)}.zip`);
  return rows.length;
}
