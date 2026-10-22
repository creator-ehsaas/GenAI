"use client";
import { ExternalLink, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KindIcon, useUpload } from "@/components/MediaPicker";
import { fmtBytes, fmtSecs } from "@/lib/ingest";
import { storageEstimate } from "@/lib/media";
import { useStore } from "@/lib/store";
import type { MediaKind, MediaRole } from "@/lib/types";

const ROLES: [MediaRole, string, string][] = [
  ["hook", "Hook clips", "Selfie-style reactions, faces, people on phones. Used behind hooks."],
  ["demo", "Demo clips", "Screen recordings and product shots for the second half of hook + demo videos."],
  ["broll", "B-roll", "Anything else: lifestyle, scenery, desk setups."],
  ["image", "Images", "Photos and screenshots for slideshows and memes."],
  ["music", "Music", "Tracks you have the rights to use."],
];

const FREE = [
  ["Pexels · selfie", "https://www.pexels.com/search/videos/selfie/?orientation=portrait"],
  ["Pexels · person on phone", "https://www.pexels.com/search/videos/woman%20phone/?orientation=portrait"],
  ["Pixabay · selfie", "https://pixabay.com/videos/search/selfie/"],
  ["Mixkit · selfie", "https://mixkit.co/free-stock-video/selfie/"],
  ["Unsplash · images", "https://unsplash.com/s/photos/aesthetic?orientation=portrait"],
];

export default function MediaPage() {
  const { media, removeMedia, updateMedia, posts } = useStore();
  const { upload, busy } = useUpload();
  const [role, setRole] = useState<MediaRole>("hook");
  const [drag, setDrag] = useState(false);
  const [est, setEst] = useState<{ used: number; quota: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storageEstimate().then(setEst);
  }, [media.length]);

  const shown = media.filter((m) => m.role === role);
  const accept = role === "music" ? "audio/*" : role === "image" ? "image/*" : "video/*,image/*";
  const usedBy = (id: string) => posts.filter((p) => p.mediaIds.includes(id) || p.demoMediaId === id || p.audioId === id).length;

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Media</h1>
          <p className="hint">Clips, images and music for your posts. Files stay in this browser (IndexedDB); nothing is uploaded to a server.</p>
        </div>
        {est && (
          <span className="small muted mono">
            {fmtBytes(est.used)} used{est.quota ? ` of ${fmtBytes(est.quota)}` : ""}
          </span>
        )}
      </div>

      <div className="seg" role="group" aria-label="Media type">
        {ROLES.map(([r, label]) => (
          <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>
            {label} {media.filter((m) => m.role === r).length || ""}
          </button>
        ))}
      </div>

      <section
        className="card"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDrag(false);
          await upload(e.dataTransfer.files, role);
        }}
        style={drag ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}
      >
        <div className="row">
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <span className="spin" /> : <Upload />} Upload {ROLES.find((r) => r[0] === role)?.[1].toLowerCase()}
          </button>
          <span className="muted small">or drop files here</span>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept={accept}
            onChange={async (e) => {
              if (e.target.files?.length) await upload(e.target.files, role);
              e.target.value = "";
            }}
          />
        </div>
        <p className="hint">{ROLES.find((r) => r[0] === role)?.[2]}</p>

        {shown.length ? (
          <div className="list">
            {shown.map((m) => (
              <div key={m.id} className="item">
                <span className="mini">{m.thumb ? <img src={m.thumb} alt="" /> : <KindIcon kind={m.kind as MediaKind} />}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="t" style={{ display: "block" }}>
                    {m.name}
                  </span>
                  <span className="m" style={{ display: "block" }}>
                    {[m.kind, fmtSecs(m.duration), m.width ? `${m.width}×${m.height}` : "", fmtBytes(m.size), usedBy(m.id) ? `in ${usedBy(m.id)} post${usedBy(m.id) > 1 ? "s" : ""}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                    {m.width && m.height && m.width > m.height ? " · landscape (will be cropped)" : ""}
                  </span>
                </span>
                <span className="row" style={{ flexWrap: "nowrap" }}>
                  {m.kind !== "audio" && (
                    <select value={m.role} onChange={(e) => updateMedia(m.id, { role: e.target.value as MediaRole })} aria-label="Role" style={{ width: "auto" }}>
                      {ROLES.filter(([r]) => r !== "music").map(([r, l]) => (
                        <option key={r} value={r}>
                          {l}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className="btn icon sm ghost danger"
                    aria-label={`Delete ${m.name}`}
                    onClick={() => (!usedBy(m.id) || confirm(`${m.name} is used in ${usedBy(m.id)} post(s). Delete anyway?`)) && removeMedia(m.id)}
                  >
                    <Trash2 />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>No {ROLES.find((r) => r[0] === role)?.[1].toLowerCase()} yet</h3>
            <p>Vertical (9:16) files look best. Landscape files are cropped to fill the frame.</p>
          </div>
        )}
      </section>

      <section className="card flat">
        <h2>Free stock footage</h2>
        <div className="row">
          {FREE.map(([l, h]) => (
            <a key={h} className="btn sm" href={h} target="_blank" rel="noopener noreferrer">
              {l} <ExternalLink />
            </a>
          ))}
        </div>
        <p className="note">
          Stock licences don&apos;t let you imply the person in a clip uses or endorses your product. Use your own footage for first-person hooks, or keep stock clips to neutral lines like
          &quot;Things nobody tells you about…&quot;.
        </p>
      </section>
    </div>
  );
}
