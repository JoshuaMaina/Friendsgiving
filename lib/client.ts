"use client";
import { useEffect, useRef, useState } from "react";

const KEY = "fg-device-id";

/** A random id saved on this phone; it's how the site remembers you. */
export function getDeviceId(): string {
  let id = "";
  try {
    id = localStorage.getItem(KEY) || "";
  } catch {}
  if (!/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  }
  return id;
}

export async function post<T = unknown>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

/** Fetch `url` now and every `ms` while the tab is visible. */
export function usePoll<T>(url: string | null, ms = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [tick, setTick] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (!url) return;
    let timer: ReturnType<typeof setTimeout>;
    let first = true;
    const load = async () => {
      clearTimeout(timer);
      // Always load once; after that, only poll while the page is visible.
      if (first || document.visibilityState === "visible") {
        first = false;
        try {
          const r = await fetch(url, { cache: "no-store" });
          if (r.ok && alive.current) setData(await r.json());
        } catch {}
      }
      if (alive.current) timer = setTimeout(load, ms);
    };
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    load();
    return () => {
      alive.current = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, ms, tick]);
  return { data, refresh: () => setTick((t) => t + 1) };
}
