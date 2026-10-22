"use client";
import { Globe, Plus, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AiBanner } from "@/components/AiBanner";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { BrandProfile } from "@/lib/types";

const EMPTY: BrandProfile = {
  name: "",
  oneLiner: "",
  description: "",
  category: "",
  audiences: [],
  painPoints: [],
  benefits: [],
  tone: "",
  keywords: [],
  hashtags: [],
  ctas: [],
};

type ListKey = "audiences" | "painPoints" | "benefits" | "keywords" | "hashtags" | "ctas";
const LISTS: [ListKey, string, string][] = [
  ["audiences", "Audiences", "Who watches and buys"],
  ["painPoints", "Pain points", "In the audience's own words"],
  ["benefits", "Benefits", "Concrete outcomes"],
  ["ctas", "Calls to action", "Soft, creator-style"],
  ["keywords", "Keywords", "Topics to talk about"],
  ["hashtags", "Hashtags", "Niche and mid-size"],
];

function ListEditor({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 6 }}>
        {value.map((v, i) => (
          <span key={i} className="chip" style={{ whiteSpace: "normal" }}>
            {v}
            <button className="btn ghost icon" style={{ padding: 0, border: 0 }} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${v}`}>
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input type="text" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <button className="btn icon" onClick={add} aria-label="Add">
          <Plus />
        </button>
      </div>
    </div>
  );
}

export default function BrandPage() {
  const { brand, brandUrl, brandNotes, setBrand } = useStore();
  const [url, setUrl] = useState(brandUrl);
  const [notes, setNotes] = useState(brandNotes);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; kind?: string } | null>(null);
  const profile = brand ?? EMPTY;
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) setUrl(u);
  }, []);
  const edit = (patch: Partial<BrandProfile>) => setBrand({ ...profile, ...patch });

  const analyze = async () => {
    if (!url.trim() && !notes.trim()) {
      setStatus({ text: "Paste your website or app store link, or describe the product.", kind: "warn" });
      return;
    }
    setBusy(true);
    setStatus({ text: "Reading the page and building your profile…" });
    try {
      const r = await api<{ profile: BrandProfile; source: { url: string; title: string } | null; warning: string | null }>("analyze", { url, notes });
      setBrand(r.profile, url, notes);
      setStatus(
        r.warning
          ? { text: `Built from your notes; the page couldn't be read (${r.warning}).`, kind: "warn" }
          : { text: `Profile built${r.source ? ` from ${r.source.title || r.source.url}` : ""}. Review and edit anything below.`, kind: "ok" },
      );
      toast("Brand profile ready", "ok");
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : "Analysis failed.", kind: "err" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Brand</h1>
          <p className="hint">Paste a link to your site, App Store or Play Store listing. Every hook, caption and idea is written from this profile.</p>
        </div>
        {brand && (
          <button
            className="btn danger sm"
            onClick={() => {
              if (confirm("Clear the brand profile?")) setBrand(null, "", "");
            }}
          >
            <Trash2 /> Clear
          </button>
        )}
      </div>
      <AiBanner />

      <section className="card">
        <div className="card-head">
          <span className="num">1</span>
          <h2>Analyze your product</h2>
        </div>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <Globe size={16} style={{ position: "absolute", left: 11, top: 12, color: "var(--muted)" }} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourproduct.com or an App Store link"
              style={{ paddingLeft: 34 }}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
            />
          </div>
          <button className="btn primary" onClick={analyze} disabled={busy}>
            {busy ? <span className="spin" /> : <Sparkles />} {brand ? "Re-analyze" : "Analyze"}
          </button>
        </div>
        <label className="field">
          <span className="label">Extra context (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who it's for, what makes it different, launch offers, things to avoid saying…" />
        </label>
        {status && <p className={`status ${status.kind ?? ""}`}>{status.text}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <span className="num">2</span>
          <h2>Profile</h2>
          <span className="spacer" />
          {brand && (
            <Link className="btn primary sm" href="/studio/ideas">
              <Sparkles /> Generate ideas
            </Link>
          )}
        </div>
        <div className="grid2">
          <label className="field">
            <span className="label">Name</span>
            <input type="text" value={profile.name} onChange={(e) => edit({ name: e.target.value })} />
          </label>
          <label className="field">
            <span className="label">Category</span>
            <input type="text" value={profile.category} onChange={(e) => edit({ category: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span className="label">One-liner</span>
          <input type="text" value={profile.oneLiner} onChange={(e) => edit({ oneLiner: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">Description</span>
          <textarea value={profile.description} onChange={(e) => edit({ description: e.target.value })} />
        </label>
        <label className="field">
          <span className="label">Tone of voice</span>
          <input type="text" value={profile.tone} onChange={(e) => edit({ tone: e.target.value })} placeholder="e.g. playful, honest, a bit chaotic" />
        </label>
        <div className="grid2">
          {LISTS.map(([k, label, ph]) => (
            <div key={k} className="field card sunk" style={{ padding: 12 }}>
              <span className="label">{label}</span>
              <ListEditor value={profile[k]} onChange={(v) => edit({ [k]: v } as Partial<BrandProfile>)} placeholder={ph} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
