"use client";
import { normalize, type DetentOptions } from "@/lib/detent.js";

// Your sliders live in this browser only (localStorage), with JSON export and import. Nothing is sent anywhere.
export type Saved = { id: string; name: string; o: DetentOptions; updated: number };
export type Store = { v: 1; sliders: Saved[]; current: string | null; howtoDone?: boolean };

const KEY = "detent:v1";
export const PRESETS: Record<string, { name: string; o: Partial<DetentOptions> }> = {
  rating: { name: "Rating", o: { label: "How was it?", min: 0, max: 10, step: 0.1, detentEvery: 1, value: 7 } },
  volume: { name: "Volume", o: { label: "Volume", min: 0, max: 100, step: 1, detentEvery: 10, value: 60, suffix: "%" } },
  stars: { name: "Stars", o: { label: "Stars", min: 1, max: 5, step: 1, detentEvery: 1, value: 4 } },
  temp: { name: "Temperature", o: { label: "Heat", min: 16, max: 30, step: 0.5, detentEvery: 1, value: 21, suffix: "°" } },
};

export const empty = (): Store => ({ v: 1, sliders: [], current: null });
export function load(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && raw.v === 1 && Array.isArray(raw.sliders)) {
      const sliders = raw.sliders.filter((s: Saved) => s && typeof s.id === "string").map((s: Saved) => ({ id: s.id, name: String(s.name || "Slider").slice(0, 60), o: normalize(s.o), updated: +s.updated || Date.now() }));
      return { v: 1, sliders, current: sliders.some((s: Saved) => s.id === raw.current) ? raw.current : sliders[0]?.id ?? null, howtoDone: !!raw.howtoDone };
    }
  } catch { /* fresh start */ }
  return empty();
}
export function save(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: still works this session */ } }
export const newId = () => Math.random().toString(36).slice(2, 10);

// settings <-> URL (?c=...), so a link or the QR opens the same slider on a phone
export function encode(name: string, o: DetentOptions): string {
  const json = JSON.stringify({ n: name, o });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decode(s: string): { name: string; o: DetentOptions } | null {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const j = JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
    return { name: String(j.n || "Shared slider").slice(0, 60), o: normalize(j.o) };
  } catch { return null; }
}
