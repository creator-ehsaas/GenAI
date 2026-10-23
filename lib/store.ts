"use client";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { deleteBlob, uid } from "./media";
import type { AdSource, BrandProfile, Competitor, CompetitorAd, Format, Idea, MediaItem, Post, SavedIdea, SavedReport, Settings, TextStyle } from "./types";

export const DEFAULT_STYLE: TextStyle = { preset: "outline", position: "upper", size: 84, font: "Montserrat", uppercase: false };

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  language: "English",
  defaultStyle: DEFAULT_STYLE,
  resolution: 720,
  postingTimes: ["09:00", "18:30"],
  postsPerDay: 2,
};

export function newPost(format: Format, patch: Partial<Post> = {}, style: TextStyle = DEFAULT_STYLE): Post {
  const now = Date.now();
  return {
    id: uid(),
    format,
    title: "",
    hook: "",
    slides: format === "slideshow" ? ["", "", "", ""] : [],
    bottomText: "",
    demoLabel: "",
    caption: "",
    hashtags: "",
    style: { ...style },
    background: "sunset",
    mediaIds: [],
    demoMediaId: null,
    audioId: null,
    duration: format === "hook_demo" ? 10 : 7,
    hookDuration: 3,
    slideDuration: 2.5,
    status: "draft",
    renderId: null,
    renderMime: null,
    renderedAt: null,
    scheduledAt: null,
    platforms: ["tiktok", "instagram"],
    metrics: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export function postFromIdea(idea: Idea, style: TextStyle): Post {
  return newPost(
    idea.format,
    {
      title: idea.title,
      hook: idea.hook,
      slides: idea.format === "slideshow" ? (idea.slides.length ? idea.slides : [idea.hook]) : [],
      bottomText: idea.format === "meme" ? (idea.slides[1] ?? "") : "",
      demoLabel: idea.demoLabel ?? "",
      caption: idea.caption,
      hashtags: idea.hashtags,
    },
    style,
  );
}

type State = {
  brand: BrandProfile | null;
  brandUrl: string;
  brandNotes: string;
  ideas: SavedIdea[];
  posts: Post[];
  media: MediaItem[];
  settings: Settings;
  competitors: Competitor[];
  report: SavedReport | null;
  addCompetitor: (c: Pick<Competitor, "name" | "url"> & Partial<Competitor>) => string;
  updateCompetitor: (id: string, patch: Partial<Competitor>) => void;
  removeCompetitor: (id: string) => void;
  addAds: (competitorId: string, ads: CompetitorAd[], source: AdSource, thumbs?: (string | undefined)[]) => number;
  removeAd: (competitorId: string, adId: string) => void;
  setReport: (r: SavedReport | null) => void;
  setBrand: (b: BrandProfile | null, url?: string, notes?: string) => void;
  addIdeas: (ideas: Idea[]) => void;
  updateIdea: (id: string, patch: Partial<SavedIdea>) => void;
  removeIdea: (id: string) => void;
  clearIdeas: () => void;
  addPosts: (posts: Post[]) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
  removePost: (id: string) => void;
  duplicatePost: (id: string) => string | null;
  addMedia: (m: MediaItem) => void;
  updateMedia: (id: string, patch: Partial<MediaItem>) => void;
  removeMedia: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      brand: null,
      brandUrl: "",
      brandNotes: "",
      ideas: [],
      posts: [],
      media: [],
      settings: DEFAULT_SETTINGS,
      competitors: [],
      report: null,
      addCompetitor: (c) => {
        const id = uid();
        set((s) => ({
          competitors: [...s.competitors, { id, notes: "", positioning: "", channels: [], research: "", ads: [], createdAt: Date.now(), ...c }],
        }));
        return id;
      },
      updateCompetitor: (id, patch) => set((s) => ({ competitors: s.competitors.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCompetitor: (id) => set((s) => ({ competitors: s.competitors.filter((c) => c.id !== id) })),
      addAds: (competitorId, ads, source, thumbs) => {
        const c = get().competitors.find((x) => x.id === competitorId);
        if (!c) return 0;
        const seen = new Set(c.ads.map((a) => a.hook.trim().toLowerCase()));
        const fresh = ads
          .map((a, i) => ({ ...a, id: uid(), source, thumb: thumbs?.[i], addedAt: Date.now() }))
          .filter((a) => {
            const k = a.hook.trim().toLowerCase();
            if (!k || seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        set((s) => ({ competitors: s.competitors.map((x) => (x.id === competitorId ? { ...x, ads: [...fresh, ...x.ads] } : x)) }));
        return fresh.length;
      },
      removeAd: (competitorId, adId) =>
        set((s) => ({ competitors: s.competitors.map((x) => (x.id === competitorId ? { ...x, ads: x.ads.filter((a) => a.id !== adId) } : x)) })),
      setReport: (report) => set({ report }),
      setBrand: (brand, url, notes) =>
        set((s) => ({ brand, brandUrl: url ?? s.brandUrl, brandNotes: notes ?? s.brandNotes })),
      addIdeas: (ideas) =>
        set((s) => ({ ideas: [...ideas.map((i) => ({ ...i, id: uid(), createdAt: Date.now(), used: false })), ...s.ideas] })),
      updateIdea: (id, patch) => set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),
      clearIdeas: () => set({ ideas: [] }),
      addPosts: (posts) => set((s) => ({ posts: [...posts, ...s.posts] })),
      updatePost: (id, patch) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)) })),
      removePost: (id) => {
        const p = get().posts.find((x) => x.id === id);
        if (p?.renderId) deleteBlob(p.renderId).catch(() => {});
        set((s) => ({ posts: s.posts.filter((x) => x.id !== id) }));
      },
      duplicatePost: (id) => {
        const p = get().posts.find((x) => x.id === id);
        if (!p) return null;
        const copy: Post = {
          ...p,
          id: uid(),
          title: p.title ? `${p.title} (copy)` : "",
          status: "draft",
          renderId: null,
          renderMime: null,
          renderedAt: null,
          scheduledAt: null,
          metrics: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ posts: [copy, ...s.posts] }));
        return copy.id;
      },
      addMedia: (m) => set((s) => ({ media: [m, ...s.media] })),
      updateMedia: (id, patch) => set((s) => ({ media: s.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMedia: (id) => {
        deleteBlob(id).catch(() => {});
        set((s) => ({
          media: s.media.filter((m) => m.id !== id),
          posts: s.posts.map((p) => ({
            ...p,
            mediaIds: p.mediaIds.filter((x) => x !== id),
            demoMediaId: p.demoMediaId === id ? null : p.demoMediaId,
            audioId: p.audioId === id ? null : p.audioId,
          })),
        }));
      },
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetAll: () => {
        const { media, posts } = get();
        media.forEach((m) => deleteBlob(m.id).catch(() => {}));
        posts.forEach((p) => p.renderId && deleteBlob(p.renderId).catch(() => {}));
        set({ brand: null, brandUrl: "", brandNotes: "", ideas: [], posts: [], media: [], competitors: [], report: null, settings: DEFAULT_SETTINGS });
      },
    }),
    {
      name: "reelforge",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

/** True once the persisted state has been read from localStorage (avoids hydration flashes). */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    if (useStore.persist.hasHydrated()) setH(true);
    return useStore.persist.onFinishHydration(() => setH(true));
  }, []);
  return h;
}
