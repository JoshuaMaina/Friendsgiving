import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const bad = (message: string, status = 400) => json({ error: message }, status);

export const cleanName = (v: unknown) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 30) : "";

export const cleanText = (v: unknown, max = 80) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export const validId = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9-]{16,64}$/.test(v);
