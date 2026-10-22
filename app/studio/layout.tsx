"use client";
import {
  BarChart3,
  CalendarDays,
  Clapperboard,
  Code2,
  FolderOpen,
  LayoutDashboard,
  Layers,
  Lightbulb,
  Menu,
  Settings,
  Sparkles,
  Store,
  Table2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Toasts } from "@/components/Toasts";
import { useHydrated, useStore } from "@/lib/store";
import { useHealth } from "@/lib/useHealth";

const NAV = [
  { sec: "Plan" },
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/brand", label: "Brand", icon: Store },
  { href: "/studio/ideas", label: "Ideas", icon: Lightbulb, count: "ideas" },
  { href: "/studio/formats", label: "Formats", icon: Layers },
  { sec: "Make" },
  { href: "/studio/create", label: "Create", icon: Sparkles },
  { href: "/studio/batch", label: "Batch", icon: Table2 },
  { href: "/studio/posts", label: "Posts", icon: Clapperboard, count: "posts" },
  { href: "/studio/media", label: "Media", icon: FolderOpen, count: "media" },
  { sec: "Grow" },
  { href: "/studio/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/studio/analytics", label: "Analytics", icon: BarChart3 },
  { sec: "More" },
  { href: "/studio/api", label: "API", icon: Code2 },
  { href: "/studio/settings", label: "Settings", icon: Settings },
] as const;

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const counts = useStore(useShallow((s) => ({ ideas: s.ideas.length, posts: s.posts.length, media: s.media.length })));
  const brand = useStore((s) => s.brand);
  const health = useHealth();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="shell">
      <aside className={`side ${open ? "open" : ""}`} aria-label="Studio navigation">
        <Link href="/" className="brandmark">
          <span className="logo">
            <Zap />
          </span>
          Reel Forge
        </Link>
        {NAV.map((n, i) =>
          "sec" in n ? (
            <div key={i} className="navsec">
              {n.sec}
            </div>
          ) : (
            <Link key={n.href} href={n.href} className="navlink" aria-current={path === n.href ? "page" : undefined}>
              <n.icon />
              {n.label}
              {"count" in n && hydrated && counts[n.count] > 0 && <span className="count">{counts[n.count]}</span>}
            </Link>
          ),
        )}
        <div className="side-foot">
          {hydrated && brand && (
            <span>
              Brand: <b style={{ color: "var(--fg)" }}>{brand.name}</b>
            </span>
          )}
          {health && <span className="mono">{health.aiConfigured ? `AI · ${health.model}` : "AI not configured"}</span>}
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div style={{ minWidth: 0 }}>
        <div className="topbar">
          <button className="btn icon ghost" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <b style={{ fontFamily: "var(--display)" }}>Reel Forge</b>
        </div>
        <main className="main">{hydrated ? children : <div className="page" aria-busy="true" />}</main>
      </div>
      <Toasts />
    </div>
  );
}
