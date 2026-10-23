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
  Swords,
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
  { href: "/studio/competitors", label: "Competitors", icon: Swords, count: "competitors" },
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

const TABS = [
  { href: "/studio", label: "Home", icon: LayoutDashboard },
  { href: "/studio/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/studio/create", label: "Create", icon: Sparkles },
  { href: "/studio/posts", label: "Posts", icon: Clapperboard },
  { href: "/studio/calendar", label: "Calendar", icon: CalendarDays },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const counts = useStore(useShallow((s) => ({ ideas: s.ideas.length, posts: s.posts.length, media: s.media.length, competitors: s.competitors.length })));
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
          {health && <span title={health.model}>{health.aiConfigured ? "AI ready" : "AI off: no API key on the server"}</span>}
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div style={{ minWidth: 0 }}>
        <div className="topbar">
          <Link href="/" className="brandmark" style={{ padding: 0, fontSize: "1.0625rem" }}>
            <span className="logo">
              <Zap />
            </span>
            Reel Forge
          </Link>
          <span className="spacer" />
          <button className="btn icon ghost" onClick={() => setOpen(true)} aria-label="All sections" aria-expanded={open}>
            <Menu />
          </button>
        </div>
        <main className="main">{hydrated ? children : <div className="page" aria-busy="true" />}</main>
      </div>
      <nav className="tabbar" aria-label="Main sections">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
            <t.icon />
            {t.label}
          </Link>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}
