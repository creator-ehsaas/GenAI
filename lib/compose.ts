import type { Composition, Segment } from "./render/engine";
import type { Post, PostStatus, TextStyle } from "./types";

const memeStyle = (s: TextStyle): TextStyle => ({ ...s, preset: "meme", font: "Anton", uppercase: true });

/** Turns a post into the timeline the renderer plays. */
export function postToComposition(post: Post): Composition {
  const base = { background: post.background };
  const hookMedia = post.mediaIds[0] ?? null;
  let segments: Segment[];
  switch (post.format) {
    case "hook_demo": {
      const hd = Math.min(post.hookDuration, post.duration - 1);
      segments = [
        { ...base, mediaId: hookMedia, duration: hd, layers: [{ text: post.hook, style: post.style }] },
        {
          ...base,
          mediaId: post.demoMediaId,
          duration: Math.max(1, post.duration - hd),
          layers: post.demoLabel ? [{ text: post.demoLabel, style: { ...post.style, position: "top", size: Math.round(post.style.size * 0.8) } }] : [],
        },
      ];
      break;
    }
    case "slideshow": {
      const filled = post.slides.filter((s) => s.trim());
      const slides = filled.length ? filled : [post.hook];
      segments = slides.map((text, i) => ({
        ...base,
        mediaId: post.mediaIds.length ? post.mediaIds[i % post.mediaIds.length] : null,
        duration: post.slideDuration,
        kenBurns: true,
        layers: [{ text, style: i === 0 ? post.style : { ...post.style, size: Math.round(post.style.size * 0.82), position: post.style.position === "upper" ? "middle" : post.style.position } }],
      }));
      break;
    }
    case "meme":
      segments = [
        {
          ...base,
          mediaId: hookMedia,
          duration: post.duration,
          layers: [
            { text: post.hook, style: memeStyle(post.style) },
            { text: post.bottomText, style: memeStyle(post.style) },
          ],
        },
      ];
      break;
    default:
      segments = [{ ...base, mediaId: hookMedia, duration: post.duration, layers: [{ text: post.hook, style: post.style }] }];
  }
  return { segments, audioId: post.audioId };
}

export const postText = (p: Post) => (p.format === "slideshow" ? p.slides.join(" / ") || p.hook : p.format === "meme" ? `${p.hook} / ${p.bottomText}` : p.hook);

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36) || "post";

export const statusChip = (s: PostStatus) => (s === "posted" ? "ok" : s === "scheduled" ? "warn" : s === "rendered" ? "accent" : "");
