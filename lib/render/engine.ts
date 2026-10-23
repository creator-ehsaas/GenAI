"use client";
import { blobUrl, getBlob } from "../media";
import type { Background, TextStyle } from "../types";

/** All drawing happens in a 1080 x 1920 coordinate space and is scaled to the canvas. */
export const BW = 1080;
export const BH = 1920;

export type Layer = { text: string; style: TextStyle };
export type Segment = {
  mediaId: string | null;
  duration: number;
  layers: Layer[];
  background: Background;
  /** Slow zoom on still images. */
  kenBurns?: boolean;
};
export type Composition = { segments: Segment[]; audioId: string | null };

export const totalDuration = (c: Composition) => c.segments.reduce((s, x) => s + x.duration, 0);

/* ---------------- backgrounds ---------------- */

const BG: Record<Background, string[]> = {
  sunset: ["#6d4bd8", "#e2597a", "#f7a64b"],
  ocean: ["#0f2b5b", "#1f6fb2", "#5ad1e6"],
  mint: ["#0d4f45", "#1f9e7a", "#a8e6c4"],
  grape: ["#1b1034", "#4d2a8a", "#b06ad9"],
  mono: ["#111216", "#25272e", "#3a3d47"],
  paper: ["#f6f1e7", "#efe6d4", "#e6dac2"],
};
export const BACKGROUNDS = Object.keys(BG) as Background[];
export const bgCss = (b: Background) => `linear-gradient(160deg, ${BG[b].join(", ")})`;

function drawBackground(ctx: CanvasRenderingContext2D, bg: Background, t: number) {
  const [a, b, c] = BG[bg];
  const g = ctx.createLinearGradient(0, 0, BW, BH);
  g.addColorStop(0, a);
  g.addColorStop(0.6, b);
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BW, BH);
  ctx.fillStyle = bg === "paper" ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.08)";
  ctx.beginPath();
  ctx.arc(BW * 0.5 + Math.sin(t / 900) * 60, BH * 0.8, 340, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------------- media ---------------- */

type Src = HTMLVideoElement | HTMLImageElement;

function drawCover(ctx: CanvasRenderingContext2D, el: Src, zoom = 1) {
  const sw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
  const sh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  const ready = el instanceof HTMLVideoElement ? el.readyState >= 2 : el.complete;
  if (!sw || !sh || !ready) {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, BW, BH);
    return;
  }
  const s = Math.max(BW / sw, BH / sh) * zoom;
  const dw = sw * s,
    dh = sh * s;
  ctx.drawImage(el, (BW - dw) / 2, (BH - dh) / 2, dw, dh);
}

/* ---------------- text ---------------- */

const POS_Y: Record<TextStyle["position"], number> = { top: 0.15, upper: 0.27, middle: 0.5, lower: 0.73 };

function fontFor(style: TextStyle) {
  const weight = style.font === "Anton" ? 400 : style.font === "Instrument Sans" ? 600 : 800;
  const fallback = style.font === "Anton" ? `Impact, "Arial Black"` : `"Arial Black", sans-serif`;
  return `${weight} ${style.size}px "${style.font}", ${fallback}`;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function drawText(ctx: CanvasRenderingContext2D, raw: string, style: TextStyle, centerY?: number) {
  const text = style.uppercase || style.preset === "meme" ? raw.toUpperCase() : raw;
  if (!text.trim()) return;
  const px = style.size;
  ctx.save();
  ctx.font = fontFor(style);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const lines = wrapText(ctx, text, BW * 0.84);
  const boxed = style.preset === "box" || style.preset === "dark";
  const lh = px * (boxed ? 1.42 : 1.2);
  const total = lh * lines.length;
  const cy = centerY ?? BH * POS_Y[style.position];
  const top = Math.min(Math.max(cy - total / 2, BH * 0.05), BH * 0.95 - total);
  lines.forEach((ln, i) => {
    const y = top + lh * i + lh / 2;
    const x = BW / 2;
    if (boxed) {
      const w = ctx.measureText(ln).width + px * 0.7;
      const h = lh + 2;
      ctx.fillStyle = style.preset === "box" ? "#fff" : "rgba(0,0,0,.72)";
      roundRect(ctx, x - w / 2, y - h / 2, w, h, px * 0.22);
      ctx.fill();
      ctx.fillStyle = style.preset === "box" ? "#000" : "#fff";
      ctx.fillText(ln, x, y + 2);
    } else if (style.preset === "shadow") {
      ctx.shadowColor = "rgba(0,0,0,.75)";
      ctx.shadowBlur = px * 0.35;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = "#fff";
      ctx.fillText(ln, x, y);
      ctx.shadowColor = "transparent";
    } else {
      ctx.lineWidth = px * (style.preset === "meme" ? 0.14 : 0.17);
      ctx.strokeStyle = "#000";
      ctx.strokeText(ln, x, y);
      ctx.fillStyle = style.preset === "yellow" ? "#ffe14a" : "#fff";
      ctx.fillText(ln, x, y);
    }
  });
  ctx.restore();
}

/* ---------------- stage: loads media and draws frames ---------------- */

export class Stage {
  private els = new Map<string, Src>();
  private loading = new Map<string, Promise<void>>();
  private active: HTMLVideoElement | null = null;

  /** Make sure every media item the composition uses is loaded. */
  async sync(comp: Composition) {
    const ids = new Set(comp.segments.map((s) => s.mediaId).filter(Boolean) as string[]);
    await Promise.all([...ids].map((id) => this.load(id)));
  }

  private load(id: string): Promise<void> {
    if (this.els.has(id)) return Promise.resolve();
    const pending = this.loading.get(id);
    if (pending) return pending;
    const p = (async () => {
      const url = await blobUrl(id);
      if (!url) return;
      const type = (await getBlob(id))?.type ?? "";
      if (type.startsWith("image/")) {
        const img = new Image();
        img.src = url;
        await img.decode().catch(() => {});
        this.els.set(id, img);
      } else {
        const v = document.createElement("video");
        v.src = url;
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
        v.crossOrigin = "anonymous";
        if (v.readyState < 1) await new Promise((r) => v.addEventListener("loadedmetadata", r, { once: true }));
        this.els.set(id, v);
      }
    })().finally(() => this.loading.delete(id));
    this.loading.set(id, p);
    return p;
  }

  /** Called when a segment starts: pauses the previous clip and starts this one at a random point. */
  async enter(seg: Segment, random = true) {
    const el = seg.mediaId ? this.els.get(seg.mediaId) : undefined;
    if (this.active && this.active !== el) this.active.pause();
    this.active = null;
    if (!(el instanceof HTMLVideoElement)) return;
    const d = el.duration || 0;
    el.loop = d < seg.duration + 0.3;
    const start = random && d > seg.duration + 0.5 ? Math.random() * (d - seg.duration - 0.3) : 0;
    if (Math.abs(el.currentTime - start) > 0.05) {
      el.currentTime = start;
      await new Promise((r) => {
        el.addEventListener("seeked", r, { once: true });
        setTimeout(r, 1500);
      });
    }
    await el.play().catch(() => {});
    this.active = el;
  }

  draw(ctx: CanvasRenderingContext2D, seg: Segment | undefined, tSeg: number, now: number) {
    const scale = ctx.canvas.width / BW;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (!seg) {
      drawBackground(ctx, "mono", now);
      return;
    }
    const el = seg.mediaId ? this.els.get(seg.mediaId) : undefined;
    if (el) {
      const p = Math.min(1, tSeg / Math.max(seg.duration, 0.1));
      drawCover(ctx, el, el instanceof HTMLImageElement && seg.kenBurns !== false ? 1 + 0.07 * p : 1);
    } else drawBackground(ctx, seg.background, now);
    const meme = seg.layers.length === 2 && seg.layers.every((l) => l.style.preset === "meme");
    seg.layers.forEach((l, i) => drawText(ctx, l.text, l.style, meme ? (i === 0 ? BH * 0.12 : BH * 0.8) : undefined));
  }

  pause() {
    this.active?.pause();
    this.active = null;
  }

  dispose() {
    this.pause();
    for (const el of this.els.values()) if (el instanceof HTMLVideoElement) el.removeAttribute("src");
    this.els.clear();
  }
}

export const fontsReady = () =>
  Promise.all(
    ["800 40px Montserrat", "400 40px Anton", "600 40px 'Instrument Sans'", "800 40px 'Bricolage Grotesque'"].map((f) =>
      document.fonts.load(f).catch(() => null),
    ),
  );
