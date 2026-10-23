"use client";
import { create } from "zustand";

type Toast = { id: number; text: string; kind: "info" | "ok" | "err" };
type S = { toasts: Toast[]; push: (text: string, kind?: Toast["kind"]) => void; dismiss: (id: number) => void };

let n = 0;
export const useToasts = create<S>((set, get) => ({
  toasts: [],
  push: (text, kind = "info") => {
    const id = ++n;
    set({ toasts: [...get().toasts.slice(-3), { id, text, kind }] });
    if (kind !== "err") setTimeout(() => get().dismiss(id), 5000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, kind?: Toast["kind"]) => useToasts.getState().push(text, kind);
