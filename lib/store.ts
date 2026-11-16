import { Redis } from "@upstash/redis";
import { emptyState, type State } from "./state";

// Works with either the Vercel "Upstash for Redis" integration (KV_REST_API_*)
// or a plain Upstash database (UPSTASH_REDIS_REST_*). With neither set
// (local dev), falls back to an in-memory store.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
console.log(
  "[fg] database settings seen:",
  JSON.stringify(Object.fromEntries(
    ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "REDIS_URL", "KV_URL"].map((k) => [k, !!process.env[k]]),
  )),
);

const KEY = "fg:state";
const LOCK = "fg:lock";

const g = globalThis as unknown as { __fgMem?: State; __fgChain?: Promise<unknown> };

export const usingRedis = () => !!redis;

export async function readState(): Promise<State> {
  if (!redis) return g.__fgMem ?? emptyState();
  const s = await redis.get<State>(KEY);
  if (!s) return emptyState();
  // Fill in fields added after the state was first saved.
  const base = emptyState();
  return {
    ...base,
    ...s,
    shirtSwap: { ...base.shirtSwap, ...s.shirtSwap },
    giftSwap: { ...base.giftSwap, ...s.giftSwap },
  };
}

async function writeState(s: State) {
  if (!redis) {
    g.__fgMem = s;
    return;
  }
  await redis.set(KEY, s);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Read-modify-write under a short lock, so 30 people joining at once
 * can't overwrite each other. `fn` mutates the state and returns a result.
 */
export async function mutate<T>(fn: (s: State) => T): Promise<T> {
  if (!redis) {
    // Serialise in-process for local dev.
    const run = async () => {
      const s = await readState();
      const out = fn(s);
      await writeState(s);
      return out;
    };
    const p = (g.__fgChain ?? Promise.resolve()).then(run, run);
    g.__fgChain = p.catch(() => undefined);
    return p;
  }
  const tokenId = Math.random().toString(36).slice(2);
  const deadline = Date.now() + 8000;
  while (true) {
    const ok = await redis.set(LOCK, tokenId, { nx: true, px: 5000 });
    if (ok) break;
    if (Date.now() > deadline) throw new Error("Busy, please try again");
    await sleep(40 + Math.random() * 80);
  }
  try {
    const s = await readState();
    const out = fn(s);
    await writeState(s);
    return out;
  } finally {
    await redis.eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
      [LOCK],
      [tokenId],
    );
  }
}
