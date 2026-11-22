import { TEAMS } from "./teams";
import { WORDS, CATEGORIES, PAIRS, WILD } from "./words";

export type Player = {
  id: string; // secret per-device id, never sent to other players
  name: string;
  team: string;
  joinedAt: number;
  shirt: { size: string; teaser: string } | null; // null = no ugly T-shirt
  gift: boolean; // brought a Secret Santa gift
  leaving?: boolean; // tapped "Heading off soon": host should reveal their swaps now
};

/** receiverId -> sourceId ("you're getting source's shirt/gift") */
/**
 * matches: receiverId -> sourceId ("receiver gets source's shirt/gift"), made in secret at launch.
 * revealed: receivers revealed so far, in order. The host reveals them one at a time.
 */
export type Swap = {
  started: boolean;
  round: number;
  matches: Record<string, string>;
  revealed: string[];
  lastAt: number; // when the latest reveal happened (0 = none yet)
};

export type Impostor = {
  round: number;
  active: boolean;
  category: string;
  word: string;
  showCategory: boolean;
  impostors: string[];
  players: string[];
  /** classic: impostors are told and get no word. undercover: impostors get a different word and aren't told. */
  mode?: "classic" | "undercover";
  impostorWord?: string;
  twist?: "similar" | "random";
};

export type MafiaRole = "mafia" | "doctor" | "detective" | "villager";
export type Mafia = {
  round: number;
  active: boolean;
  roles: Record<string, MafiaRole>;
  out: string[];
};

export type Vote = { open: boolean; votes: Record<string, string> };

/** Gifts dropped in a pile: guests take turns going up to pick one, in a random order. */
export type GiftPick = {
  started: boolean;
  order: string[];
  called: number;
  lastAt: number;
  /** order index -> a special message for that turn (e.g. a dedicated gift) */
  notes?: Record<string, string>;
  /** order index -> name to show on screen instead of the guest's own (joke) name */
  labels?: Record<string, string>;
};
export const emptyGiftPick = (): GiftPick => ({ started: false, order: [], called: 0, lastAt: 0 });

export function startGiftPick(s: State) {
  s.giftPick = { started: true, order: shuffle(Object.keys(s.players)), called: 0, lastAt: 0 };
}

/** Anyone who arrived since the order was made joins at a random spot among those not yet called. */
export function syncGiftPick(s: State) {
  const gp = s.giftPick;
  if (!gp?.started) return;
  gp.order = gp.order.filter((id, i) => i < gp.called || id in s.players);
  for (const id of Object.keys(s.players)) {
    if (gp.order.includes(id)) continue;
    const at = gp.called + Math.floor(Math.random() * (gp.order.length - gp.called + 1));
    gp.order.splice(at, 0, id);
  }
}

/**
 * Call someone up next for a special gift with a message, without losing their normal turn.
 * Starts the pick order first if needed.
 */
export function specialGiftPick(s: State, id: string, message: string, label = "") {
  if (!s.giftPick?.started) startGiftPick(s);
  syncGiftPick(s);
  const gp = s.giftPick!;
  const at = gp.called;
  gp.order.splice(at, 0, id);
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(gp.notes ?? {})) notes[String(Number(k) >= at ? Number(k) + 1 : Number(k))] = v;
  notes[String(at)] = message;
  gp.notes = notes;
  const labels: Record<string, string> = {};
  for (const [k, v] of Object.entries(gp.labels ?? {})) labels[String(Number(k) >= at ? Number(k) + 1 : Number(k))] = v;
  if (label) labels[String(at)] = label;
  gp.labels = labels;
}

/** Change the name/message on the turn just called and show it on the TV again (no extra turn). */
export function reshowGiftPick(s: State, message: string, label: string): boolean {
  const gp = s.giftPick;
  if (!gp?.started || !gp.called) return false;
  const k = String(gp.called - 1);
  gp.notes = { ...(gp.notes ?? {}), [k]: message };
  gp.labels = { ...(gp.labels ?? {}) };
  if (label) gp.labels[k] = label;
  else delete gp.labels[k];
  gp.lastAt = Date.now();
  return true;
}

/** Turn counts that leave out special call-ups, so the display reads "1 of 31" for normal picks. */
export function pickCounts(gp: GiftPick) {
  const specials = Object.keys(gp.notes ?? {}).map(Number);
  const specialsCalled = specials.filter((i) => i < gp.called).length;
  return { done: gp.called - specialsCalled, total: gp.order.length - specials.length };
}

export function nextGiftPick(s: State): boolean {
  syncGiftPick(s);
  const gp = s.giftPick;
  if (!gp?.started || gp.called >= gp.order.length) return false;
  gp.called++;
  gp.lastAt = Date.now();
  return true;
}

/** What the host has put up as "happening now"; every phone shows it live. */
/** activity "custom" uses the host-typed label + emoji (a game made up on the night). */
export type Now = { activity: string; message: string; at: number; label?: string; emoji?: string };

export type State = {
  players: Record<string, Player>;
  scores: Record<string, number>;
  shirtSwap: Swap;
  giftSwap: Swap;
  impostor: Impostor;
  mafia: Mafia;
  vote: Vote;
  now: Now;
  photosUrl: string; // shared album link set by the host ('' = none)
  activeTeams: number; // how many teams are in play (the first N); new guests only go into these
  musicUrl?: string; // Spotify Jam link so guests can queue songs ('' = none)
  giftPick?: GiftPick;
};

export const emptySwap = (): Swap => ({ started: false, round: 0, matches: {}, revealed: [], lastAt: 0 });

export const emptyState = (): State => ({
  players: {},
  scores: Object.fromEntries(TEAMS.map((t) => [t.id, 0])),
  shirtSwap: emptySwap(),
  giftSwap: emptySwap(),
  impostor: { round: 0, active: false, category: "", word: "", showCategory: true, impostors: [], players: [] },
  mafia: { round: 0, active: false, roles: {}, out: [] },
  vote: { open: false, votes: {} },
  now: { activity: "arrivals", message: "", at: 0 },
  // Shared Google Photos album; the host can change or clear it on the dashboard.
  photosUrl: "https://photos.app.goo.gl/rtwtxEgkvK9Ss9GP8",
  activeTeams: TEAMS.length,
  musicUrl: "https://open.spotify.com/socialsession/7ca32iVSeIyrOPNPq4rI4n?si=Uj45cFZcQJiwqGBpcJ5SyA",
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
export const teamsInPlay = (s: State) =>
  TEAMS.slice(0, Math.min(TEAMS.length, Math.max(1, s.activeTeams || TEAMS.length)));

const teamCounts = (s: State) => {
  const counts = Object.fromEntries(TEAMS.map((t) => [t.id, 0])) as Record<string, number>;
  for (const p of Object.values(s.players)) if (p.team in counts) counts[p.team]++;
  return counts;
};

/** Least-filled team in play wins; ties broken at random. */
export function pickTeam(s: State): string {
  const counts = teamCounts(s);
  const live = teamsInPlay(s);
  const min = Math.min(...live.map((t) => counts[t.id]));
  return pick(live.filter((t) => counts[t.id] === min).map((t) => t.id));
}

/** Deal everyone out again, evenly, across the teams in play, in random order. */
export function reshuffleTeams(s: State) {
  const order = shuffle(teamsInPlay(s).map((t) => t.id));
  shuffle(Object.values(s.players)).forEach((p, i) => {
    p.team = order[i % order.length];
  });
}

/**
 * Even out teams across the teams in play, moving as few people as possible:
 * anyone in a team that's out of play, then the most recent arrivals from the biggest teams,
 * go to the smallest teams. Returns how many people moved.
 */
export function balanceTeams(s: State): number {
  const live: string[] = teamsInPlay(s).map((t) => t.id);
  const players = Object.values(s.players).sort((a, b) => a.joinedAt - b.joinedAt);
  const n = players.length;
  const base = Math.floor(n / live.length);
  let extra = n % live.length;
  const counts = teamCounts(s);
  // Teams already biggest keep the "+1" slots, so fewer people move.
  const target: Record<string, number> = {};
  [...live].sort((a, b) => counts[b] - counts[a]).forEach((id) => {
    target[id] = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
  });
  const movers: Player[] = players.filter((p) => !live.includes(p.team));
  for (const id of live) {
    const members = players.filter((p) => p.team === id);
    movers.push(...members.slice(target[id]).reverse()); // newest leave first
  }
  let moved = 0;
  for (const p of movers) {
    const now = teamCounts(s);
    const dest = live.filter((id) => now[id] < target[id]).sort((a, b) => now[a] - now[b])[0];
    if (!dest || dest === p.team) continue;
    p.team = dest;
    moved++;
  }
  return moved;
}

// ---------- swaps (T-shirts, gifts) ----------
/**
 * Everyone who brought an item gets someone else's.
 * First run: one random cycle (A gets B's, B gets C's, ... last gets A's), so nobody gets their own.
 * Later runs: each newcomer is spliced into the cycle (r was getting s's; now r gets x's and x gets s's),
 * which keeps everyone already matched valid. Returns ids still waiting (needs 2+ people to start).
 */
export function runSwap(swap: Swap, eligible: string[]): string[] {
  swap.revealed ??= [];
  swap.lastAt ??= 0;
  const elig = new Set(eligible);
  const unreveal = (id: string) => (swap.revealed = swap.revealed.filter((x) => x !== id));
  // Drop people who left or un-ticked, repairing the cycle around them.
  for (const r of Object.keys(swap.matches)) {
    if (!(r in swap.matches)) continue;
    const src = swap.matches[r];
    if (!elig.has(r)) {
      // whoever was getting r's item now gets what r was getting
      const giver = Object.keys(swap.matches).find((k) => swap.matches[k] === r);
      delete swap.matches[r];
      unreveal(r);
      if (giver && giver !== src) swap.matches[giver] = src;
      else if (giver) delete swap.matches[giver];
      if (giver) unreveal(giver); // their item changed, so reveal them again
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
      // Splice into someone not yet revealed, so nobody's reveal changes after the fact.
      const unrevealed = Object.keys(swap.matches).filter((k) => !swap.revealed.includes(k));
      const r = pick(unrevealed.length ? unrevealed : Object.keys(swap.matches));
      const src = swap.matches[r];
      swap.matches[r] = x;
      swap.matches[x] = src;
      unreveal(r);
    }
  }
  swap.started = true;
  swap.round++;
  return [];
}

/**
 * Reveal the next swap. Chain order: the person whose item was just revealed is up next
 * ("Ama gets Sam's shirt" -> "Sam gets ..."). When a loop closes, start from someone random.
 */
export function revealNext(swap: Swap): string | null {
  const left = Object.keys(swap.matches).filter((r) => !swap.revealed.includes(r));
  if (!left.length) return null;
  const last = swap.revealed[swap.revealed.length - 1];
  const chained = last ? swap.matches[last] : undefined;
  const next = chained && left.includes(chained) ? chained : pick(left);
  swap.revealed.push(next);
  swap.lastAt = Date.now();
  return next;
}

export function revealAll(swap: Swap) {
  let n = 0;
  while (revealNext(swap)) n++;
  return n;
}

/** Reveal one particular person now, out of order (e.g. they're about to leave). */
export function revealPerson(swap: Swap, id: string): boolean {
  if (!(id in swap.matches) || swap.revealed.includes(id)) return false;
  swap.revealed.push(id);
  swap.lastAt = Date.now();
  return true;
}

/**
 * Keep running swaps in step with who's here: once a swap has started, anyone who checks in
 * with a shirt/gift is added straight away, and anyone removed is taken out. If everyone has
 * already been revealed, a newcomer is spliced in by "stealing": someone revealed earlier
 * gets the newcomer's item and the newcomer gets what that person had (both are re-revealed).
 */
export function syncSwaps(s: State) {
  const players = Object.values(s.players);
  if (s.shirtSwap.started) runSwap(s.shirtSwap, players.filter((p) => !!p.shirt).map((p) => p.id));
  if (s.giftSwap.started) runSwap(s.giftSwap, players.filter((p) => p.gift).map((p) => p.id));
}

/** The order the remaining reveals will go in (for the host's "up next"). */
export function upNext(swap: Swap): string | null {
  const left = Object.keys(swap.matches).filter((r) => !swap.revealed.includes(r));
  if (!left.length) return null;
  const last = swap.revealed[swap.revealed.length - 1];
  const chained = last ? swap.matches[last] : undefined;
  return chained && left.includes(chained) ? chained : null; // null = random pick
}

// ---------- impostor ----------
export function startImpostor(
  s: State,
  count: number,
  category: string,
  showCategory: boolean,
  mode: "classic" | "undercover" = "classic",
  twist: "similar" | "random" = "random",
) {
  const ids = Object.keys(s.players);
  const n = Math.max(1, Math.min(count, ids.length - 1));
  const impostors = shuffle(ids).slice(0, n);
  const base = { round: s.impostor.round + 1, active: true, showCategory, impostors, players: ids, mode };

  if (mode === "undercover" && twist === "similar") {
    let pair = pick(PAIRS);
    if (PAIRS.length > 1) while (pair.includes(s.impostor.word)) pair = pick(PAIRS);
    const [crowd, odd] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    s.impostor = { ...base, category: "", word: crowd, impostorWord: odd, twist };
    return;
  }

  const cat = category && WORDS[category] ? category : pick(CATEGORIES);
  let word = pick(WORDS[cat]);
  if (WORDS[cat].length > 1) while (word === s.impostor.word) word = pick(WORDS[cat]);

  if (mode === "undercover") {
    // Totally random: something from a different world entirely.
    const pool = [...WILD, ...CATEGORIES.filter((c) => c !== cat).flatMap((c) => WORDS[c])];
    s.impostor = { ...base, category: cat, word, impostorWord: pick(pool), twist: "random" };
    return;
  }
  s.impostor = { ...base, category: cat, word };
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
  if (imp.active && imp.players.includes(id) && imp.mode === "undercover") {
    // Identical shape for everyone, so nobody can tell from their screen (or the network) that they're the odd one out.
    impostor = {
      round: imp.round,
      undercover: true as const,
      isImpostor: false,
      word: imp.impostors.includes(id) ? imp.impostorWord ?? "" : imp.word,
      category: null,
      impostorCount: null, // secret in undercover: nobody (host included) is told how many
    };
  } else if (imp.active && imp.players.includes(id)) {
    const isImp = imp.impostors.includes(id);
    impostor = {
      undercover: false as const,
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
    const revealed = sw.revealed ?? [];
    const total = Object.keys(sw.matches).length;
    const src = sw.matches[id];
    if (!src) return { status: "queue" as const, done: revealed.length, total };
    const giverTo = Object.keys(sw.matches).find((k) => sw.matches[k] === id);
    const givenAway = giverTo && revealed.includes(giverTo) ? nameOf(s, giverTo) : null;
    if (!revealed.includes(id)) return { status: "waiting" as const, done: revealed.length, total, givenAway };
    const owner = s.players[src];
    return {
      status: "revealed" as const,
      done: revealed.length,
      total,
      givenAway,
      from: nameOf(s, src),
      fromTeam: owner?.team ?? "",
      teaser: owner?.shirt?.teaser ?? "",
      size: owner?.shirt?.size ?? "",
    };
  };
  return {
    now: s.now,
    me: { name: p.name, team: p.team, shirt: p.shirt, gift: p.gift, leaving: !!p.leaving },
    impostor,
    mafia,
    shirtSwap: swapView(s.shirtSwap, !!p.shirt),
    giftSwap: swapView(s.giftSwap, p.gift),
    vote: s.vote.open
      ? {
          myVote: s.vote.votes[id] ? nameOf(s, s.vote.votes[id]) : null,
          candidates: Object.values(s.players)
            .filter((x) => x.shirt && x.id !== id)
            .map((x) => ({ key: voteKey(x), name: x.name, teaser: x.shirt?.teaser ?? "", wornBy: wornBy(s, x.id) })),
        }
      : null,
  };
}

/** Who is now wearing this person's shirt (only once that swap has been revealed). */
function wornBy(s: State, ownerId: string): string | null {
  const sw = s.shirtSwap;
  const r = Object.keys(sw.matches).find((k) => sw.matches[k] === ownerId);
  return r && (sw.revealed ?? []).includes(r) ? nameOf(s, r) : null;
}

/** Public, id-free key for vote candidates. */
export const voteKey = (p: Player) => `${p.name}::${p.joinedAt}`;

export function publicView(s: State) {
  const live = new Set(teamsInPlay(s).map((t) => t.id));
  const teams = TEAMS.filter(
    (t) => live.has(t.id) || (s.scores[t.id] ?? 0) !== 0 || Object.values(s.players).some((p) => p.team === t.id),
  ).map((t) => ({
    id: t.id,
    members: Object.values(s.players)
      .filter((p) => p.team === t.id)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => p.name),
    score: s.scores[t.id] ?? 0,
  }));
  const shirts = Object.values(s.players).filter((p) => p.shirt).length;
  const gifts = Object.values(s.players).filter((p) => p.gift).length;
  return {
    teams,
    playerCount: Object.keys(s.players).length,
    shirts,
    gifts,
    now: s.now,
    photosUrl: s.photosUrl ?? "",
    musicUrl: s.musicUrl ?? "",
    reveals: [latestReveal(s, "shirt"), latestReveal(s, "gift"), latestPick(s)].filter(Boolean),
  };
}

/** The most recent reveal of a swap, for the big pop-up on the TV and phones. */
/** Latest "go pick a gift" call, shown as a pop-up like the swap reveals. */
export function latestPick(s: State) {
  const gp = s.giftPick;
  if (!gp?.started || !gp.called) return null;
  const cur = gp.order[gp.called - 1];
  const next = gp.order[gp.called];
  return {
    kind: "pick" as const,
    at: gp.lastAt,
    receiver: gp.labels?.[String(gp.called - 1)] || nameOf(s, cur),
    from: next ? nameOf(s, next) : "",
    teaser: "",
    message: gp.notes?.[String(gp.called - 1)] ?? "",
    n: pickCounts(gp).done,
    total: pickCounts(gp).total,
  };
}

export function latestReveal(s: State, kind: "shirt" | "gift") {
  const sw = kind === "shirt" ? s.shirtSwap : s.giftSwap;
  const revealed = sw.revealed ?? [];
  if (!sw.started || !revealed.length) return null;
  const r = revealed[revealed.length - 1];
  const src = sw.matches[r];
  const owner = s.players[src];
  return {
    kind,
    at: sw.lastAt,
    receiver: nameOf(s, r),
    from: nameOf(s, src),
    teaser: kind === "shirt" ? owner?.shirt?.teaser ?? "" : "",
    n: revealed.length,
    total: Object.keys(sw.matches).length,
  };
}

export function voteResults(s: State) {
  const tally: Record<string, number> = {};
  for (const target of Object.values(s.vote.votes)) tally[target] = (tally[target] ?? 0) + 1;
  return Object.entries(tally)
    .map(([id, votes]) => ({ name: nameOf(s, id), votes }))
    .sort((a, b) => b.votes - a.votes);
}
