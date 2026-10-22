"use client";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { useEffect, useRef } from "react";
import { type Composition, fontsReady, Stage } from "@/lib/render/engine";

/** Plays a composition on loop in a phone frame. Text edits apply live; media reloads only when it changes. */
export function PhonePreview({ comp, caption, handle = "yourbrand", chrome = true }: { comp: Composition; caption?: string; handle?: string; chrome?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const compRef = useRef(comp);
  compRef.current = comp;
  const stageRef = useRef<Stage | null>(null);
  const mediaKey = comp.segments.map((s) => s.mediaId ?? "-").join("|");

  useEffect(() => {
    const stage = new Stage();
    stageRef.current = stage;
    return () => stage.dispose();
  }, []);

  useEffect(() => {
    const stage = stageRef.current!;
    const ctx = canvas.current!.getContext("2d")!;
    let raf = 0;
    let alive = true;
    let idx = 0;
    let segStart = performance.now();
    let entering = false;
    (async () => {
      await Promise.all([fontsReady(), stage.sync(compRef.current)]);
      if (!alive) return;
      const first = compRef.current.segments[0];
      if (first) await stage.enter(first);
      segStart = performance.now();
      const loop = (now: number) => {
        if (!alive) return;
        const c = compRef.current;
        if (idx >= c.segments.length) idx = 0;
        const seg = c.segments[idx];
        if (seg && (now - segStart) / 1000 >= seg.duration && !entering) {
          idx = (idx + 1) % c.segments.length;
          segStart = now;
          entering = true;
          stage.enter(c.segments[idx]).finally(() => (entering = false));
        }
        stage.draw(ctx, c.segments[idx], (now - segStart) / 1000, now);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stage.pause();
    };
  }, [mediaKey]);

  return (
    <div className="phone">
      <canvas ref={canvas} width={540} height={960} aria-label="Video preview" />
      {chrome && (
        <>
          <div className="ui" aria-hidden="true">
            <Heart />
            <MessageCircle />
            <Bookmark />
            <Send />
          </div>
          {caption && (
            <div className="cap" aria-hidden="true">
              <b>@{handle}</b>
              {caption}
            </div>
          )}
        </>
      )}
    </div>
  );
}
