"use client";
import { blobUrl } from "../media";
import { BH, BW, type Composition, fontsReady, Stage, totalDuration } from "./engine";

const VIDEO_ONLY = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
const WITH_AUDIO = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickMime(audio: boolean): string | null {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return null;
  return (audio ? WITH_AUDIO : VIDEO_ONLY).find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}
export const extFor = (mime: string) => (mime.startsWith("video/mp4") ? "mp4" : "webm");
export const canRecord = () => pickMime(false) !== null;

export type RenderResult = { blob: Blob; mime: string; ext: string };

/**
 * Plays the composition onto an offscreen canvas in real time and records it.
 * The tab must stay visible: browsers pause animation frames in background tabs.
 */
export async function renderComposition(
  comp: Composition,
  opts: { width?: number; fps?: number; onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<RenderResult> {
  const width = opts.width ?? 720;
  const height = Math.round((width * BH) / BW);
  const fps = opts.fps ?? 30;
  const mime = pickMime(Boolean(comp.audioId));
  if (!mime) throw new Error("This browser can't record video. Use a recent Chrome, Edge or Safari.");
  await fontsReady();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const stage = new Stage();
  await stage.sync(comp);

  const stream = canvas.captureStream(fps);
  let audioCtx: AudioContext | null = null;
  let audioEl: HTMLAudioElement | null = null;
  let gain: GainNode | null = null;
  if (comp.audioId) {
    const url = await blobUrl(comp.audioId);
    if (url) {
      audioEl = new Audio(url);
      audioEl.loop = true;
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaElementSource(audioEl);
      gain = audioCtx.createGain();
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(gain).connect(dest);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
  }

  const total = totalDuration(comp);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: width >= 1080 ? 10_000_000 : 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => rec.addEventListener("stop", r, { once: true }));

  try {
    let segIdx = 0;
    await stage.enter(comp.segments[0]);
    stage.draw(ctx, comp.segments[0], 0, performance.now());
    if (audioEl && audioCtx) {
      await audioCtx.resume();
      audioEl.currentTime = 0;
      await audioEl.play().catch(() => {});
    }
    rec.start(250);
    const t0 = performance.now();
    let segStart = t0;
    let entering = false;

    await new Promise<void>((resolve, reject) => {
      const tick = (now: number) => {
        if (opts.signal?.aborted) return reject(new DOMException("Render cancelled", "AbortError"));
        const elapsed = (now - t0) / 1000;
        if (elapsed >= total) return resolve();
        const seg = comp.segments[segIdx];
        const tSeg = (now - segStart) / 1000;
        if (tSeg >= seg.duration && segIdx < comp.segments.length - 1 && !entering) {
          entering = true;
          segIdx++;
          segStart = now;
          stage.enter(comp.segments[segIdx]).finally(() => (entering = false));
        }
        if (gain && audioCtx) gain.gain.value = Math.max(0, Math.min(1, (total - elapsed) / 0.6));
        stage.draw(ctx, comp.segments[segIdx], (now - segStart) / 1000, now);
        opts.onProgress?.(elapsed / total);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  } finally {
    if (rec.state !== "inactive") rec.stop();
    await stopped;
    stage.dispose();
    audioEl?.pause();
    await audioCtx?.close().catch(() => {});
    stream.getTracks().forEach((t) => t.stop());
  }
  opts.onProgress?.(1);
  const type = mime.split(";")[0];
  return { blob: new Blob(chunks, { type }), mime: type, ext: extFor(type) };
}

/** Draws each segment as a still PNG (for photo carousels). */
export async function renderStills(comp: Composition, width = 1080): Promise<Blob[]> {
  await fontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((width * BH) / BW);
  const ctx = canvas.getContext("2d")!;
  const stage = new Stage();
  await stage.sync(comp);
  const out: Blob[] = [];
  try {
    for (const seg of comp.segments) {
      await stage.enter(seg, false);
      stage.pause();
      stage.draw(ctx, { ...seg, kenBurns: false }, 0, 0);
      out.push(await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG export failed"))), "image/png")));
    }
  } finally {
    stage.dispose();
  }
  return out;
}
