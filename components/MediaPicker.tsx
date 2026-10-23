"use client";
import { Check, Film, Image as ImageIcon, Music, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fmtSecs, ingestFile } from "@/lib/ingest";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { MediaItem, MediaKind, MediaRole } from "@/lib/types";

export function MediaThumb({ id, onRemove, label }: { id: string | null; onRemove?: () => void; label?: string }) {
  const m = useStore((s) => s.media.find((x) => x.id === id));
  return (
    <div className="thumb" style={{ cursor: "default" }}>
      {m?.thumb ? <img src={m.thumb} alt={m.name} /> : <div className="ph">{m?.kind === "audio" ? <Music /> : <Film />}</div>}
      {(label || m?.duration) && <span className="tag">{label ?? fmtSecs(m?.duration)}</span>}
      {onRemove && (
        <button className="x" onClick={onRemove} aria-label={`Remove ${m?.name ?? "media"}`}>
          <X />
        </button>
      )}
    </div>
  );
}

export function KindIcon({ kind }: { kind: MediaKind }) {
  return kind === "image" ? <ImageIcon /> : kind === "audio" ? <Music /> : <Film />;
}

/** Uploads files into the media library. */
export function useUpload() {
  const addMedia = useStore((s) => s.addMedia);
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | File[], role?: MediaRole): Promise<MediaItem[]> => {
    setBusy(true);
    const out: MediaItem[] = [];
    try {
      for (const f of Array.from(files)) {
        if (!/^(video|image|audio)\//.test(f.type)) {
          toast(`${f.name} isn't a video, image or audio file.`, "err");
          continue;
        }
        try {
          const m = await ingestFile(f, role);
          addMedia(m);
          out.push(m);
        } catch (e) {
          toast(`Couldn't add ${f.name}: ${e instanceof Error ? e.message : "unknown error"}`, "err");
        }
      }
    } finally {
      setBusy(false);
    }
    return out;
  };
  return { upload, busy };
}

export function MediaPicker({
  open,
  onClose,
  onPick,
  kinds,
  role,
  multiple = false,
  title = "Choose media",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
  kinds: MediaKind[];
  role?: MediaRole;
  multiple?: boolean;
  title?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const media = useStore((s) => s.media);
  const [sel, setSel] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<MediaRole | "all">("all");
  const { upload, busy } = useUpload();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setSel([]);
      setRoleFilter(role && kinds.includes("video") ? role : "all");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, role, kinds]);

  const list = media.filter((m) => kinds.includes(m.kind) && (roleFilter === "all" || m.role === roleFilter));
  const roles = [...new Set(media.filter((m) => kinds.includes(m.kind)).map((m) => m.role))];
  const accept = kinds.map((k) => `${k}/*`).join(",");

  const toggle = (id: string) => {
    if (!multiple) {
      onPick([id]);
      onClose();
      return;
    }
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onCancel={onClose}>
      <div className="modal-in">
        <div className="modal-head">
          <h2>{title}</h2>
          <span className="spacer" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="row">
          <button className="btn primary sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <span className="spin" /> : <Upload />} Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept={accept}
            onChange={async (e) => {
              const files = e.target.files;
              if (!files?.length) return;
              const added = await upload(files, role);
              e.target.value = "";
              if (added.length && !multiple) {
                onPick([added[0].id]);
                onClose();
              } else setSel((s) => [...s, ...added.map((a) => a.id)]);
            }}
          />
          {roles.length > 1 && (
            <div className="seg" role="group" aria-label="Filter by role">
              <button aria-pressed={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
                All
              </button>
              {roles.map((r) => (
                <button key={r} aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ maxHeight: "55dvh", overflowY: "auto", padding: 2 }}>
          {list.length ? (
            <div className="thumbs">
              {list.map((m) => (
                <button key={m.id} className="thumb" aria-pressed={sel.includes(m.id)} onClick={() => toggle(m.id)} title={m.name}>
                  {m.thumb ? <img src={m.thumb} alt={m.name} /> : <div className="ph"><KindIcon kind={m.kind} /></div>}
                  <span className="tag">{m.kind === "image" ? m.role : fmtSecs(m.duration) || m.role}</span>
                  {sel.includes(m.id) && (
                    <span className="x" style={{ background: "var(--accent)" }}>
                      <Check />
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Nothing here yet</h3>
              <p>Upload {kinds.join(" or ")} files to use them in posts. They stay in this browser.</p>
            </div>
          )}
        </div>
        {multiple && (
          <div className="row">
            <span className="muted small">{sel.length} selected</span>
            <span className="spacer" />
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!sel.length}
              onClick={() => {
                onPick(sel);
                onClose();
              }}
            >
              Add {sel.length || ""}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
