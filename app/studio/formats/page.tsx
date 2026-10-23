"use client";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { AiBanner, BrandHint } from "@/components/AiBanner";
import { api } from "@/lib/api";
import { FORMAT_LABELS, FORMATS, type Format } from "@/lib/schemas";
import { newPost, useStore } from "@/lib/store";
import { TEMPLATES, type Template } from "@/lib/templates";
import { toast } from "@/lib/toast";

export default function FormatsPage() {
  const { brand, settings, addPosts } = useStore();
  const [filter, setFilter] = useState<Format | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [hooks, setHooks] = useState<Record<string, string[]>>({});

  const generate = async (t: Template) => {
    setBusy(t.id);
    try {
      const r = await api<{ hooks: string[] }>("hooks", { brand, count: 6, template: t.template, language: settings.language });
      setHooks((h) => ({ ...h, [t.id]: r.hooks }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't generate", "err");
    } finally {
      setBusy(null);
    }
  };

  const toPosts = (t: Template, list: string[]) => {
    addPosts(
      list.map((h) => {
        const [top, bottom] = h.split(/\s*\|\s*/);
        return newPost(
          t.format,
          {
            title: `${t.name}: ${top.slice(0, 40)}`,
            hook: top,
            bottomText: t.format === "meme" ? (bottom ?? "") : "",
            slides: t.format === "slideshow" ? [top, "", "", ""] : [],
          },
          settings.defaultStyle,
        );
      }),
    );
    toast(`${list.length} drafts added to Posts`, "ok");
  };

  const shown = TEMPLATES.filter((t) => filter === "all" || t.format === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Formats</h1>
          <p className="hint">Proven short-form structures. Generate hooks that fit your product into any of them, then send them to Posts.</p>
        </div>
      </div>
      <AiBanner />
      <BrandHint />
      <div className="seg" role="group" aria-label="Filter formats">
        <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All
        </button>
        {FORMATS.map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {FORMAT_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {shown.map((t) => (
          <article key={t.id} className="card" style={{ alignContent: "start" }}>
            <div className="row">
              <span className="chip accent">{FORMAT_LABELS[t.format]}</span>
              {t.tags.map((g) => (
                <span key={g} className="chip">
                  {g}
                </span>
              ))}
            </div>
            <h3>{t.name}</h3>
            <p className="mono small">{t.template}</p>
            <p className="small">
              <span className="muted">e.g.</span> “{t.example}”
            </p>
            <p className="small muted">{t.why}</p>
            <div className="row">
              <button className="btn sm primary" onClick={() => generate(t)} disabled={busy !== null}>
                {busy === t.id ? <span className="spin" /> : <Sparkles />} Write 6 for my product
              </button>
            </div>
            {hooks[t.id]?.length ? (
              <div className="stack" style={{ gap: 6 }}>
                {hooks[t.id].map((h, i) => (
                  <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
                    <span className="small" style={{ flex: 1 }}>
                      {h}
                    </span>
                    <button className="btn icon sm ghost" onClick={() => toPosts(t, [h])} aria-label="Add as draft" title="Add as draft">
                      <Plus />
                    </button>
                  </div>
                ))}
                <button className="btn sm" onClick={() => toPosts(t, hooks[t.id])}>
                  Add all {hooks[t.id].length} as drafts
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
