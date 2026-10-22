"use client";
import { putBlob, uid } from "./media";
import type { MediaItem, MediaKind, MediaRole } from "./types";

const once = (el: EventTarget, ev: string) => new Promise((r) => el.addEventListener(ev, r, { once: true }));

function thumbFrom(src: CanvasImageSource, sw: number, sh: number): string {
  const c = document.createElement("canvas");
  c.width = 144;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const s = Math.max(c.width / sw, c.height / sh);
  ctx.drawImage(src, (c.width - sw * s) / 2, (c.height - sh * s) / 2, sw * s, sh * s);
  return c.toDataURL("image/jpeg", 0.6);
}

/** Stores a file in IndexedDB and returns its metadata (with duration, size and a small thumbnail). */
export async function ingestFile(file: File, role?: MediaRole): Promise<MediaItem> {
  const kind: MediaKind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "video";
  const id = uid();
  const item: MediaItem = {
    id,
    name: file.name,
    kind,
    role: role ?? (kind === "image" ? "image" : kind === "audio" ? "music" : "hook"),
    mime: file.type,
    size: file.size,
    createdAt: Date.now(),
  };
  const url = URL.createObjectURL(file);
  try {
    if (kind === "video") {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;
      await Promise.race([once(v, "loadeddata"), once(v, "error")]);
      item.duration = v.duration;
      item.width = v.videoWidth;
      item.height = v.videoHeight;
      if (v.videoWidth) {
        v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
        await Promise.race([once(v, "seeked"), new Promise((r) => setTimeout(r, 1500))]);
        item.thumb = thumbFrom(v, v.videoWidth, v.videoHeight);
      }
    } else if (kind === "image") {
      const img = new Image();
      img.src = url;
      await img.decode();
      item.width = img.naturalWidth;
      item.height = img.naturalHeight;
      item.thumb = thumbFrom(img, img.naturalWidth, img.naturalHeight);
    } else {
      const a = new Audio(url);
      await Promise.race([once(a, "loadedmetadata"), once(a, "error")]);
      item.duration = a.duration;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
  await putBlob(id, file);
  return item;
}

export const fmtBytes = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);
export const fmtSecs = (s?: number) => (s && isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");
