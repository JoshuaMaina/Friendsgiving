import { TEAMS } from "./teams";
import { WORDS, CATEGORIES } from "./words";

export type Player = {
  id: string; // secret per-device id, never sent to other players
  name: string;
  team: string;
  joinedAt: number;
  shirt: { size: string; teaser: string } | null; // null = no ugly T-shirt
  gift: boolean; // brought a Secret Santa gift
};

/** receiverId -> sourceId ("you're getting source's shirt/gift") */
export type Swap = { started: boolean; round: number; matches: Record<string, string> };

export type Impostor = {
  round: number;
  active: boolean;
  category: string;
  word: string;
  showCategory: boolean;
  impostors: string[];
  players: string[];
};

export type MafiaRole = "mafia" | "doctor" | "detective" | "villager";
export type Mafia = {
  round: number;
  active: boolean;
  roles: Record<string, MafiaRole>;
  out: string[];
};

export type Vote = { open: boolean; votes: Record<string, string> };

/** What the host has put up as "happening now"; every phone shows it live. */
export type Now = { activity: string; message: string; at: number };

export type State = {
  players: Record<string, Player>;
  scores: Record<string, number>;
  shirtSwap: Swap;
  giftSwap: Swap;
  impostor: Impostor;
  mafia: Mafia;
  vote: Vote;
  now: Now;
};

export const emptySwap = (): Swap => ({ started: false, round: 0, matches: {} });

export const emptyState = (): State => ({
  players: {},
  scores: Object.fromEntries(TEAMS.map((t) => [t.id, 0])),
  shirtSwap: emptySwap(),
  giftSwap: emptySwap(),
  impostor: { round: 0, active: false, category: "", word: "", showCategory: true, impostors: [], players: [] },
  mafia: { round: 0, active: false, roles: {}, out: [] },
  vote: { open: false, votes: {} },
  now: { activity: "arrivals", message: "", at: 0 },
});

// ---------- helpers ----------
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// ---------- teams ----------
/** Least-filled team wins; ties broken at random. */
export function pickTeam(s: State): string {
  const counts = Object.fromEntries(TEAMS.map((t) => [t.id, 0])) as Record<string, number>;
  for (const p of Object.values(s.players)) if (p.team in counts) counts[p.team]++;
  const min = Math.min(...Object.values(counts));
  return pick(TEAMS.filter((t) => counts[t.id] === min).map((t) => t.id));
}

/** Deal everyone out again, evenly, in random order. */
export function reshuffleTeams(s: State) {
  const order = shuffle(TEAMS.map((t) => t.id));
  shuffle(Object.values(s.players)).forEach((p, i) => {
    p.team = order[i % order.length];
  });
}

// ---------- swaps (T-shirts, gifts) ----------
/**
 * Everyone who brought an item gets someone else's.
 * First run: one random cycle (A gets B's, B gets C's, ... last gets A's), so nobody gets their own.
 * Later runs: each newcomer is spliced into the cycle (r was getting s's; now r gets x's and x gets s's),
 * which keeps everyone already matched valid. Returns ids still waiting (needs 2+ people to start).
 */
export function runSwap(swap: Swap, eligible: string[]): string[] {
  const elig = new Set(eligible);
  // Drop matches involving people who left or un-ticked: repair the cycle around them.
  for (const r of Object.keys(swap.matches)) {
    if (!(r in swap.matches)) continue;
    const src = swap.matches[r];
    if (!elig.has(r)) {
      // whoever was getting r's item now gets what r was getting
      const giver = Object.keys(swap.matches).find((k) => swap.matches[k] === r);
      delete swap.matches[r];
      if (giver && giver !== src) swap.matches[giver] = src;
      else if (giver) delete swap.matches[giver];
    }
  }
  const pending = shuffle(eligible.filter((id) => !(id in swap.matches)));
  if (Object.keys(swap.matches).length === 0) {
    if (pending.length < 2) return pending;
    pending.forEach((id, i) => {
      swap.matches[id] = pending[(i + 1) % pending.length];
    });
  } else {
    for (const x of pending) {
      const r = pick(Object.keys(swap.matches));
      const src = swap.matches[r];
      swap.matches[r] = x;
      swap.matches[x] = src;
    }
  }
  swap.started = true;
  swap.round++;
  return [];
}

// ---------- impostor ----------
export function startImpostor(s: State, count: number, category: string, showCategory: boolean) {
  const ids = Object.keys(s.players);
  const n = Math.max(1, Math.min(count, ids.length - 1));
  const cat = category && WORDS[category] ? category : pick(CATEGORIES);
  let word = pick(WORDS[cat]);
  if (WORDS[cat].length > 1) while (word === s.impostor.word) word = pick(WORDS[cat]);
  s.impostor = {
    round: s.impostor.round + 1,
    active: true,
    category: cat,
    word,
    showCategory,
    impostors: shuffle(ids).slice(0, n),
    players: ids,
  };
}

// ---------- mafia ----------
export function startMafia(s: State, mafia: number, doctor: boolean, detective: boolean) {
  const ids = shuffle(Object.keys(s.players));
  const roles: Record<string, MafiaRole> = {};
  let i = 0;
  const m = Math.max(1, Math.min(mafia, ids.length - 1));
  for (; i < m; i++) roles[ids[i]] = "mafia";
  if (doctor && i < ids.length) roles[ids[i++]] = "doctor";
  if (detective && i < ids.length) roles[ids[i++]] = "detective";
  for (; i < ids.length; i++) roles[ids[i]] = "villager";
  s.mafia = { round: s.mafia.round + 1, active: true, roles, out: [] };
}

export const suggestedMafia = (n: number) => Math.max(1, Math.round(n / 5));

// ---------- views ----------
const nameOf = (s: State, id: string) => s.players[id]?.name ?? "Someone";

/** What one player is allowed to see. */
export function playerView(s: State, id: string) {
  const p = s.players[id];
  if (!p) return null;
  const imp = s.impostor;
  let impostor = null;
  if (imp.active && imp.players.includes(id)) {
    const isImp = imp.impostors.includes(id);
    impostor = {
      round: imp.round,
      isImpostor: isImp,
      word: isImp ? null : imp.word,
      category: isImp ? (imp.showCategory ? imp.category : null) : imp.category,
      impostorCount: imp.impostors.length,
    };
  }
  let mafia = null;
  const role = s.mafia.active ? s.mafia.roles[id] : undefined;
  if (role) {
    mafia = {
      round: s.mafia.round,
      role,
      out: s.mafia.out.includes(id),
      partners:
        role === "mafia"
          ? Object.entries(s.mafia.roles)
              .filter(([k, r]) => r === "mafia" && k !== id)
              .map(([k]) => nameOf(s, k))
          : [],
    };
  }
  const swapView = (sw: Swap, mine: boolean) => {
    if (!sw.started || !mine) return null;
    const src = sw.matches[id];
    if (!src) return { waiting: true as const };
    const owner = s.players[src];
    return {
      waiting: false as const,
      from: nameOf(s, src),
      fromTeam: owner?.team ?? "",
      teaser: owner?.shirt?.teaser ?? "",
      size: owner?.shirt?.size ?? "",
    };
  };
  return {
    now: s.now,
    me: { name: p.name, team: p.team, shirt: p.shirt, gift: p.gift },
    impostor,
    mafia,
    shirtSwap: swapView(s.shirtSwap, !!p.shirt),
    giftSwap: swapView(s.giftSwap, p.gift),
    vote: s.vote.open
      ? {
          myVote: s.vote.votes[id] ? nameOf(s, s.vote.votes[id]) : null,
          candidates: Object.values(s.players)
            .filter((x) => x.shirt && x.id !== id)
            .map((x) => ({ key: voteKey(x), name: x.name, teaser: x.shirt?.teaser ?? "" })),
        }
      : null,
  };
}

/** Public, id-free key for vote candidates. */
export const voteKey = (p: Player) => `${p.name}::${p.joinedAt}`;

export function publicView(s: State) {
  const teams = TEAMS.map((t) => ({
    id: t.id,
    members: Object.values(s.players)
      .filter((p) => p.team === t.id)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.name),
    score: s.scores[t.id] ?? 0,
  }));
  const shirts = Object.values(s.players).filter((p) => p.shirt).length;
  const gifts = Object.values(s.players).filter((p) => p.gift).length;
  return { teams, playerCount: Object.keys(s.players).length, shirts, gifts, now: s.now };
}

export function voteResults(s: State) {
  const tally: Record<string, number> = {};
  for (const target of Object.values(s.vote.votes)) tally[target] = (tally[target] ?? 0) + 1;
  return Object.entries(tally)
    .map(([id, votes]) => ({ name: nameOf(s, id), votes }))
    .sort((a, b) => b.votes - a.votes);
}
