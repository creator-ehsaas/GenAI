"use client";
import { createStore, del, get, keys, set } from "idb-keyval";

/** Binary media (clips, images, audio, rendered videos) lives in IndexedDB; metadata lives in the app store. */
const blobs = typeof indexedDB !== "undefined" ? createStore("reelforge-media", "blobs") : undefined;
const urls = new Map<string, string>();

export async function putBlob(id: string, blob: Blob) {
  if (!blobs) throw new Error("This browser has no IndexedDB.");
  await set(id, blob, blobs);
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  if (!blobs) return undefined;
  return get<Blob>(id, blobs);
}

export async function deleteBlob(id: string) {
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
  if (blobs) await del(id, blobs);
}

export async function blobUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const b = await getBlob(id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urls.set(id, u);
  return u;
}

export async function storedIds(): Promise<string[]> {
  if (!blobs) return [];
  return (await keys(blobs)).map(String);
}

export async function storageEstimate(): Promise<{ used: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { used: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
