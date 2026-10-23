"use client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useHealth } from "@/lib/useHealth";

/** Warns when AI features can't work: no server key, or an access key is required but not entered. */
export function AiBanner() {
  const h = useHealth();
  const key = useStore((s) => s.settings.apiKey);
  if (!h) return null;
  if (!h.aiConfigured)
    return (
      <div className="banner warn">
        <AlertTriangle />
        <span>
          AI is off: the server has no <code>GEMINI_API_KEY</code>. Add it to <code>.env.local</code> and restart. Editing and rendering still work.
        </span>
      </div>
    );
  if (h.apiKeyRequired && !key)
    return (
      <div className="banner warn">
        <AlertTriangle />
        <span>
          This server requires an access key. Enter it in <Link href="/studio/settings">Settings</Link>.
        </span>
      </div>
    );
  return null;
}

export function BrandHint() {
  const brand = useStore((s) => s.brand);
  if (brand) return null;
  return (
    <div className="banner info">
      <AlertTriangle />
      <span>
        Set up your <Link href="/studio/brand">brand</Link> first so the AI writes about your product, not in generalities.
      </span>
    </div>
  );
}
