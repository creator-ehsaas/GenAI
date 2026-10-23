"use client";
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Download, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { postText } from "@/lib/compose";
import { downloadBlob } from "@/lib/media";
import { FORMAT_LABELS } from "@/lib/schemas";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Platform, Post, PostStatus } from "@/lib/types";

const PLATFORMS: [Platform, string][] = [
  ["tiktok", "TikTok"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube Shorts"],
];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const at = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);
}
function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function ScheduleDialog({ post, day, onClose }: { post: Post | null; day: Date | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { posts, updatePost, settings } = useStore();
  const [pickId, setPickId] = useState<string>("");
  const [when, setWhen] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const target = post ?? posts.find((p) => p.id === pickId) ?? null;
  const open = Boolean(post || day);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) {
      const base = post?.scheduledAt ? new Date(post.scheduledAt) : at(day ?? new Date(Date.now() + 864e5), settings.postingTimes[0] ?? "18:00");
      setWhen(toLocalInput(base.toISOString()));
      setPlatforms(post?.platforms ?? ["tiktok", "instagram"]);
      setPickId("");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, post, day, settings.postingTimes]);

  const candidates = posts.filter((p) => p.status !== "posted" && !p.scheduledAt);
  const save = (status?: PostStatus) => {
    if (!target) return;
    updatePost(target.id, { scheduledAt: new Date(when).toISOString(), platforms, status: status ?? (target.status === "posted" ? "posted" : "scheduled") });
    toast(status === "posted" ? "Marked as posted" : "Scheduled", "ok");
    onClose();
  };

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onCancel={onClose} style={{ width: "min(520px, calc(100vw - 32px))" }}>
      <div className="modal-in">
        <div className="modal-head">
          <h2>{post?.scheduledAt ? "Edit schedule" : "Schedule a post"}</h2>
          <span className="spacer" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {!post && (
          <label className="field">
            <span className="label">Post</span>
            <select value={pickId} onChange={(e) => setPickId(e.target.value)}>
              <option value="">Choose an unscheduled post…</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  [{FORMAT_LABELS[p.format]}{p.renderId ? "" : ", not rendered"}] {(p.title || postText(p)).slice(0, 70)}
                </option>
              ))}
            </select>
            {!candidates.length && <span className="small muted">Every post is already scheduled or posted.</span>}
          </label>
        )}
        {target && (
          <p className="small">
            <b>{target.title || postText(target)}</b>
            <br />
            <span className="muted">{target.caption}</span>
          </p>
        )}
        <label className="field">
          <span className="label">Date and time</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <div className="field">
          <span className="label">Platforms</span>
          <div className="row">
            {PLATFORMS.map(([p, l]) => (
              <button key={p} className="chip" aria-pressed={platforms.includes(p)} onClick={() => setPlatforms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {target && !target.renderId && <p className="status warn">This post isn&apos;t rendered yet. Render it before the date.</p>}
        <div className="row">
          {post?.scheduledAt && (
            <button
              className="btn danger"
              onClick={() => {
                updatePost(post.id, { scheduledAt: null, status: post.renderId ? "rendered" : "draft" });
                onClose();
              }}
            >
              Unschedule
            </button>
          )}
          {target && (
            <Link className="btn" href={`/studio/create?id=${target.id}`}>
              Open editor
            </Link>
          )}
          <span className="spacer" />
          {target && target.status !== "posted" && (
            <button className="btn" onClick={() => save("posted")} disabled={!when}>
              Mark posted
            </button>
          )}
          <button className="btn primary" onClick={() => save()} disabled={!target || !when || !platforms.length}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
}

function CalendarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { posts, settings, setSettings, updatePost } = useStore();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editing, setEditing] = useState<Post | null>(null);
  const [addDay, setAddDay] = useState<Date | null>(null);

  useEffect(() => {
    const id = params.get("schedule");
    const p = id ? useStore.getState().posts.find((x) => x.id === id) : null;
    if (p) setEditing(p);
  }, [params]);

  const days = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.scheduledAt) continue;
      const k = dayKey(new Date(p.scheduledAt));
      m.set(k, [...(m.get(k) ?? []), p].sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!)));
    }
    return m;
  }, [posts]);

  const unscheduled = posts.filter((p) => !p.scheduledAt && p.status !== "posted");
  const upcoming = posts.filter((p) => p.scheduledAt && p.status === "scheduled" && new Date(p.scheduledAt) > new Date()).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const overdue = posts.filter((p) => p.scheduledAt && p.status === "scheduled" && new Date(p.scheduledAt) <= new Date());

  const autoSchedule = () => {
    const queue = [...unscheduled].sort((a, b) => Number(Boolean(b.renderId)) - Number(Boolean(a.renderId)) || a.createdAt - b.createdAt);
    if (!queue.length) return toast("Nothing to schedule.", "info");
    const times = [...settings.postingTimes].sort().slice(0, settings.postsPerDay);
    if (!times.length) return toast("Add posting times first.", "err");
    const taken = new Set(posts.filter((p) => p.scheduledAt).map((p) => new Date(p.scheduledAt!).toISOString()));
    const day = new Date();
    day.setDate(day.getDate() + 1);
    let n = 0;
    while (queue.length && n < 1000) {
      for (const t of times) {
        if (!queue.length) break;
        const slot = at(day, t).toISOString();
        if (taken.has(slot)) continue;
        const p = queue.shift()!;
        updatePost(p.id, { scheduledAt: slot, status: "scheduled" });
        taken.add(slot);
      }
      day.setDate(day.getDate() + 1);
      n++;
    }
    toast(`Scheduled ${unscheduled.length} post${unscheduled.length === 1 ? "" : "s"}, ${times.length} a day`, "ok");
  };

  const exportIcs = () => {
    const evs = posts.filter((p) => p.scheduledAt && p.status === "scheduled");
    if (!evs.length) return toast("No scheduled posts to export.", "info");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Reel Forge//EN", "CALSCALE:GREGORIAN"];
    for (const p of evs) {
      const s = new Date(p.scheduledAt!);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${p.id}@reelforge`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(s)}`,
        `DTEND:${icsDate(new Date(s.getTime() + 15 * 60e3))}`,
        `SUMMARY:${icsEscape(`Post: ${(p.title || postText(p)).slice(0, 60)}`)}`,
        `DESCRIPTION:${icsEscape(`${p.platforms.join(", ")}\n\n${p.caption}\n\n${p.hashtags}`)}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT10M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Time to post",
        "END:VALARM",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    downloadBlob(new Blob([lines.join("\r\n")], { type: "text/calendar" }), "reelforge-schedule.ics");
  };

  const monthEvents = posts
    .filter((p) => p.scheduledAt && new Date(p.scheduledAt).getMonth() === month.getMonth() && new Date(p.scheduledAt).getFullYear() === month.getFullYear())
    .sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
  const today = dayKey(new Date());
  const closeDialog = () => {
    setEditing(null);
    setAddDay(null);
    if (params.get("schedule")) router.replace("/studio/calendar");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="titles">
          <h1>Calendar</h1>
          <p className="hint">Plan when each post goes out. Export to your calendar to get a reminder with the caption ready to paste.</p>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              setAddDay(d);
            }}
          >
            <CalendarPlus /> Schedule post
          </button>
          <button className="btn" onClick={exportIcs}>
            <Download /> Export .ics
          </button>
          <button className="btn primary" onClick={autoSchedule} disabled={!unscheduled.length}>
            <Wand2 /> Auto-schedule {unscheduled.length}
          </button>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="banner warn">
          <CalendarDays />
          <span>
            {overdue.length} scheduled post{overdue.length > 1 ? "s are" : " is"} past due. Post {overdue.length > 1 ? "them" : "it"}, then mark as posted.
          </span>
        </div>
      )}

      <div className="row between">
        <div className="row">
          <button className="btn icon" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month">
            <ChevronLeft />
          </button>
          <h2 style={{ minWidth: 170, textAlign: "center" }}>{month.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
          <button className="btn icon" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month">
            <ChevronRight />
          </button>
          <button className="btn sm ghost" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
        </div>
        <div className="row small">
          <span className="muted">Auto-schedule:</span>
          <select value={settings.postsPerDay} onChange={(e) => setSettings({ postsPerDay: +e.target.value })} style={{ width: "auto" }} aria-label="Posts per day">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} a day
              </option>
            ))}
          </select>
          {settings.postingTimes.slice(0, settings.postsPerDay).map((t, i) => (
            <input
              key={i}
              type="time"
              value={t}
              style={{ width: "auto" }}
              aria-label={`Posting time ${i + 1}`}
              onChange={(e) => {
                const next = [...settings.postingTimes];
                next[i] = e.target.value;
                setSettings({ postingTimes: next });
              }}
            />
          ))}
          {settings.postingTimes.length < settings.postsPerDay && (
            <button className="btn sm" onClick={() => setSettings({ postingTimes: [...settings.postingTimes, "12:00"] })}>
              + time
            </button>
          )}
        </div>
      </div>

      <div className="cal" role="grid" aria-label="Posting calendar">
        {DOW.map((d) => (
          <div key={d} className="dow" role="columnheader">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const k = dayKey(d);
          const evs = byDay.get(k) ?? [];
          return (
            <div key={k} role="gridcell" className={`day ${d.getMonth() !== month.getMonth() ? "out" : ""} ${k === today ? "today" : ""}`}>
              <span className="dn">{d.getDate()}</span>
              {evs.map((p) => (
                <button key={p.id} className={`ev ${p.status === "posted" ? "posted" : ""}`} onClick={() => setEditing(p)} title={postText(p)}>
                  {p.status === "posted" && <Check aria-label="Posted" />}
                  {new Date(p.scheduledAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {p.title || postText(p)}
                </button>
              ))}
              {evs.length > 0 && (
                <span className="cnt" aria-hidden="true">
                  {evs.length} post{evs.length > 1 ? "s" : ""}
                </span>
              )}
              <button className="addday" onClick={() => setAddDay(d)} aria-label={`Schedule on ${d.toDateString()}`}>
                + add
              </button>
            </div>
          );
        })}
      </div>

      <section className="card flat agenda" aria-label={`Posts in ${month.toLocaleDateString([], { month: "long" })}`}>
        <h2>This month</h2>
        {monthEvents.length ? (
          <div className="list">
            {monthEvents.map((p) => (
              <button key={p.id} className="item" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => setEditing(p)}>
                <span className="small" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {new Date(p.scheduledAt!).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="t">{p.title || postText(p)}</span>
                <span className={`chip ${p.status === "posted" ? "ok" : "warn"}`}>
                  {p.status === "posted" && <Check size={12} />}
                  {p.status === "posted" ? "Posted" : "Scheduled"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">Nothing scheduled this month.</p>
        )}
      </section>

      <div className="grid2">
        <section className="card flat">
          <h2>Up next</h2>
          {upcoming.length ? (
            <div className="list">
              {upcoming.slice(0, 8).map((p) => (
                <button key={p.id} className="item" style={{ gridTemplateColumns: "auto minmax(0,1fr)", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => setEditing(p)}>
                  <span className="mono small">{new Date(p.scheduledAt!).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="t">{p.title || postText(p)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">Nothing scheduled.</p>
          )}
        </section>
        <section className="card flat">
          <h2>Not scheduled · {unscheduled.length}</h2>
          {unscheduled.length ? (
            <div className="list">
              {unscheduled.slice(0, 8).map((p) => (
                <button key={p.id} className="item" style={{ gridTemplateColumns: "auto minmax(0,1fr)", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => setEditing(p)}>
                  <span className={`chip ${p.renderId ? "accent" : ""}`}>{p.renderId ? "rendered" : "draft"}</span>
                  <span className="t">{p.title || postText(p)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted small">All caught up.</p>
          )}
        </section>
      </div>

      <ScheduleDialog post={editing} day={addDay} onClose={closeDialog} />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarInner />
    </Suspense>
  );
}
