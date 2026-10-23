"use client";
import { useEffect, useState } from "react";

export type Health = { ok: boolean; model: string; aiConfigured: boolean; apiKeyRequired: boolean };
let cache: Promise<Health | null> | null = null;

export function useHealth() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => {
    cache ??= fetch("/api/health")
      .then((r) => r.json())
      .catch(() => null);
    cache.then(setH);
  }, []);
  return h;
}
