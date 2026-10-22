"use client";
import { Download, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { StyleControls } from "@/components/StyleControls";
import { downloadBlob } from "@/lib/media";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useHealth } from "@/lib/useHealth";

const LANGS = ["English", "Hinglish", "Hindi", "Spanish", "Portuguese", "French", "German", "Indonesian", "Arabic", "Japanese"];

export default function SettingsPage() {
  const { settings, setSettings, resetAll } = useStore();
  const health = useHealth();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const { brand, brandUrl, brandNotes, ideas, posts, media, settings } = useStore.getState();
    const data = { version: 1, exportedAt: new Date().toISOString(), brand, brandUrl, brandNotes, ideas, posts, media, settings: { ...settings, apiKey: "" } };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "reelforge-workspace.json");
  };

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="titles">
          <h1>Settings</h1>
        </div>
      </div>

      <section className="card">
        <h2>Content</h2>
        <label className="field" style={{ maxWidth: 280 }}>
          <span className="label">Language for AI writing</span>
          <select value={settings.language} onChange={(e) => setSettings({ language: e.target.value })}>
            {LANGS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ maxWidth: 280 }}>
          <span className="label">Render resolution</span>
          <select value={settings.resolution} onChange={(e) => setSettings({ resolution: +e.target.value as 720 | 1080 })}>
            <option value={720}>720 × 1280 (faster, smaller files)</option>
            <option value={1080}>1080 × 1920 (sharper)</option>
          </select>
        </label>
        <div className="field">
          <span className="label">Default text style for new posts</span>
          <StyleControls style={settings.defaultStyle} onChange={(defaultStyle) => setSettings({ defaultStyle })} />
        </div>
      </section>

      <section className="card">
        <h2>Server</h2>
        {health ? (
          <p className="small">
            Model: <code>{health.model}</code> · AI {health.aiConfigured ? "configured" : <b style={{ color: "var(--warn)" }}>not configured</b>} · Access key{" "}
            {health.apiKeyRequired ? "required" : "not required"}
          </p>
        ) : (
          <p className="small muted">Checking…</p>
        )}
        <label className="field" style={{ maxWidth: 420 }}>
          <span className="label">Access key (REELFORGE_API_KEY)</span>
          <input type="password" value={settings.apiKey} onChange={(e) => setSettings({ apiKey: e.target.value })} placeholder="Only needed if the server sets one" autoComplete="off" />
        </label>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="hint">Everything lives in this browser. Export a backup of your brand, ideas, posts and schedule (media files and rendered videos are not included).</p>
        <div className="row">
          <button className="btn" onClick={exportData}>
            <Download /> Export workspace
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload /> Import workspace
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const d = JSON.parse(await f.text());
                if (d.version !== 1) throw new Error("Not a Reel Forge workspace file.");
                useStore.setState({
                  brand: d.brand ?? null,
                  brandUrl: d.brandUrl ?? "",
                  brandNotes: d.brandNotes ?? "",
                  ideas: d.ideas ?? [],
                  posts: (d.posts ?? []).map((p: { renderId?: string }) => ({ ...p, renderId: null })),
                  settings: { ...settings, ...d.settings, apiKey: settings.apiKey },
                });
                toast("Workspace imported. Re-upload media and re-render videos.", "ok");
              } catch (err) {
                toast(err instanceof Error ? err.message : "Import failed", "err");
              }
            }}
          />
          <span className="spacer" />
          <button className="btn danger" onClick={() => confirm("Delete everything: brand, ideas, posts, media and videos? This can't be undone.") && resetAll()}>
            <Trash2 /> Delete all data
          </button>
        </div>
      </section>
    </div>
  );
}
