import { mutate, readState, usingRedis } from "@/lib/store";
import {
  emptyState,
  emptySwap,
  reshuffleTeams,
  revealAll,
  revealNext,
  runSwap,
  startImpostor,
  upNext,
  startMafia,
  voteResults,
  type State,
  type Swap,
} from "@/lib/state";
import { TEAMS } from "@/lib/teams";
import { bad, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const setNow = (s: State, activity: string) => {
  s.now = { activity, message: "", at: Date.now() };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function adminView(s: State) {
  const name = (id: string) => s.players[id]?.name ?? "(left)";
  const players = Object.values(s.players)
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({ id: p.id, name: p.name, team: p.team, shirt: p.shirt, gift: p.gift }));
  const swap = (sw: Swap, eligible: string[]) => {
    const revealed = sw.revealed ?? [];
    const next = upNext(sw);
    return {
      started: sw.started,
      pairs: Object.entries(sw.matches).map(([r, src]) => ({ receiver: name(r), from: name(src), revealed: revealed.includes(r) })),
      waiting: sw.started ? eligible.filter((id) => !(id in sw.matches)).map(name) : [],
      eligible: eligible.length,
      revealedCount: revealed.length,
      total: Object.keys(sw.matches).length,
      upNext: next ? name(next) : null,
      last: revealed.length ? { receiver: name(revealed[revealed.length - 1]), from: name(sw.matches[revealed[revealed.length - 1]]) } : null,
    };
  };
  return {
    usingRedis: usingRedis(),
    envSeen: Object.fromEntries(
      ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "REDIS_URL", "KV_URL"].map((k) => [k, !!process.env[k]]),
    ),
    players,
    scores: s.scores,
    shirtSwap: swap(s.shirtSwap, players.filter((p) => p.shirt).map((p) => p.id)),
    giftSwap: swap(s.giftSwap, players.filter((p) => p.gift).map((p) => p.id)),
    impostor: {
      ...s.impostor,
      impostors: s.impostor.impostors.map(name),
      players: s.impostor.players.length,
    },
    mafia: {
      round: s.mafia.round,
      active: s.mafia.active,
      roles: Object.entries(s.mafia.roles)
        .map(([id, role]) => ({ id, name: name(id), role, out: s.mafia.out.includes(id) }))
        .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
    },
    now: s.now,
    photosUrl: s.photosUrl ?? "",
    vote: { open: s.vote.open, count: Object.keys(s.vote.votes).length, results: voteResults(s) },
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const pin = process.env.HOST_PIN;
  if (!pin) return bad("HOST_PIN isn't set. Add it in Vercel → Settings → Environment Variables.", 500);
  if (body.pin !== pin) {
    await sleep(800); // slow down guessing
    return bad("Wrong PIN", 401);
  }
  const a: string = body.action;
  if (a === "state") return json(adminView(await readState()));

  try {
    const err = await mutate((s): string | null => {
      switch (a) {
        case "moveTeam": {
          const p = s.players[body.playerId];
          if (!p || !TEAMS.some((t) => t.id === body.team)) return "Bad player or team";
          p.team = body.team;
          return null;
        }
        case "removePlayer":
          delete s.players[body.playerId];
          return null;
        case "reshuffle":
          reshuffleTeams(s);
          return null;
        case "addScore": {
          if (!(body.team in s.scores)) return "Bad team";
          s.scores[body.team] = (s.scores[body.team] ?? 0) + Number(body.delta || 0);
          return null;
        }
        case "resetScores":
          s.scores = emptyState().scores;
          return null;
        case "impostorStart":
          if (Object.keys(s.players).length < 3) return "Need at least 3 players";
          startImpostor(s, Number(body.count) || 2, body.category || "", body.showCategory !== false);
          setNow(s, "impostor");
          return null;
        case "impostorEnd":
          s.impostor.active = false;
          return null;
        case "mafiaStart":
          if (Object.keys(s.players).length < 4) return "Need at least 4 players";
          startMafia(s, Number(body.mafia) || 1, body.doctor !== false, body.detective !== false);
          setNow(s, "mafia");
          return null;
        case "mafiaToggleOut": {
          const id = body.playerId;
          s.mafia.out = s.mafia.out.includes(id) ? s.mafia.out.filter((x) => x !== id) : [...s.mafia.out, id];
          return null;
        }
        case "mafiaEnd":
          s.mafia.active = false;
          return null;
        case "shirtSwap":
        case "giftSwap": {
          const key = a;
          const eligible = Object.values(s.players)
            .filter((p) => (key === "shirtSwap" ? !!p.shirt : p.gift))
            .map((p) => p.id);
          runSwap(s[key], eligible);
          if (!s[key].started) return "Need at least 2 people checked in";
          // Matches are made in secret; nothing is revealed until the host reveals each one,
          // so whatever is happening now (e.g. the spelling bee) carries on.
          return null;
        }
        case "shirtReveal":
        case "giftReveal": {
          const sw = a === "shirtReveal" ? s.shirtSwap : s.giftSwap;
          if (!sw.started) return "Start the swap first";
          return revealNext(sw) ? null : "Everyone’s been revealed";
        }
        case "shirtRevealAll":
        case "giftRevealAll": {
          const sw = a === "shirtRevealAll" ? s.shirtSwap : s.giftSwap;
          if (!sw.started) return "Start the swap first";
          revealAll(sw);
          return null;
        }
        case "shirtSwapReset":
          s.shirtSwap = emptySwap();
          return null;
        case "giftSwapReset":
          s.giftSwap = emptySwap();
          return null;
        case "voteOpen":
          s.vote.open = true;
          setNow(s, "vote");
          return null;
        case "voteClose":
          s.vote.open = false;
          return null;
        case "voteReset":
          s.vote = { open: false, votes: {} };
          return null;
        case "setNow":
          s.now = {
            activity: String(body.activity || "arrivals").slice(0, 30),
            message: String(body.message || "").slice(0, 140),
            at: Date.now(),
          };
          if (s.now.activity === "custom") {
            const label = String(body.label || "").replace(/\s+/g, " ").trim().slice(0, 40);
            if (!label) return "Give the game a name";
            s.now.label = label;
            s.now.emoji = [...String(body.emoji || "🎲").trim()].slice(0, 2).join("") || "🎲";
          }
          return null;
        case "setPhotos": {
          const u = String(body.url || "").trim();
          if (u) {
            try {
              const parsed = new URL(u);
              if (parsed.protocol !== "https:") return "Use an https:// link";
            } catch {
              return "That doesn’t look like a link";
            }
          }
          s.photosUrl = u.slice(0, 500);
          return null;
        }
        case "resetAll":
          if (body.confirm !== "RESET") return "Type RESET to confirm";
          Object.assign(s, emptyState());
          return null;
        default:
          return "Unknown action";
      }
    });
    if (err) return bad(err);
    return json(adminView(await readState()));
  } catch (e) {
    return bad((e as Error).message, 503);
  }
}
