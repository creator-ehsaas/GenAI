import type { BrandProfile, CompetitorAd, Format, Idea, PatternReport } from "./schemas";

export type MediaKind = "video" | "image" | "audio";
export type MediaRole = "hook" | "demo" | "broll" | "image" | "music";

export type MediaItem = {
  id: string;
  name: string;
  kind: MediaKind;
  role: MediaRole;
  mime: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  thumb?: string;
  createdAt: number;
};

export type TextPreset = "outline" | "box" | "dark" | "shadow" | "yellow" | "meme";
export type TextPosition = "top" | "upper" | "middle" | "lower";
export type FontFamily = "Montserrat" | "Anton" | "Instrument Sans" | "Bricolage Grotesque";

export type TextStyle = {
  preset: TextPreset;
  position: TextPosition;
  size: number; // px at 1080 wide
  font: FontFamily;
  uppercase: boolean;
};

export type Background = "sunset" | "ocean" | "mint" | "grape" | "mono" | "paper";

export type Platform = "tiktok" | "instagram" | "youtube";

export type PostStatus = "draft" | "rendered" | "scheduled" | "posted";

export type Metrics = { views: number; likes: number; comments: number; shares: number; saves: number };

export type Post = {
  id: string;
  format: Format;
  title: string;
  hook: string;
  /** Slideshow slide texts (slide 1 is usually the hook). */
  slides: string[];
  /** Meme bottom line. */
  bottomText: string;
  /** Label over the demo part of a hook + demo video. */
  demoLabel: string;
  caption: string;
  hashtags: string;
  style: TextStyle;
  background: Background;
  /** Hook clip (hook_video, hook_demo, meme) or slide images (slideshow), in order. */
  mediaIds: string[];
  demoMediaId: string | null;
  audioId: string | null;
  duration: number;
  hookDuration: number;
  slideDuration: number;
  status: PostStatus;
  renderId: string | null;
  renderMime: string | null;
  renderedAt: number | null;
  scheduledAt: string | null;
  platforms: Platform[];
  metrics: Metrics | null;
  createdAt: number;
  updatedAt: number;
};

export type SavedIdea = Idea & { id: string; createdAt: number; used: boolean };

export type Settings = {
  apiKey: string;
  language: string;
  defaultStyle: TextStyle;
  resolution: 720 | 1080;
  postingTimes: string[];
  postsPerDay: number;
};

export type AdSource = "paste" | "screenshot" | "meta" | "research" | "manual";
export type SavedAd = CompetitorAd & { id: string; source: AdSource; thumb?: string; addedAt: number };

export type Competitor = {
  id: string;
  name: string;
  url: string;
  notes: string;
  positioning: string;
  channels: string[];
  research: string;
  ads: SavedAd[];
  createdAt: number;
};

export type SavedReport = { report: PatternReport; createdAt: number; adCount: number; competitorIds: string[] };

export type { BrandProfile, CompetitorAd, Format, Idea, PatternReport };
