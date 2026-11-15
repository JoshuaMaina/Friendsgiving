import { mutate, readState } from "@/lib/store";
import { playerView, voteKey } from "@/lib/state";
import { bad, cleanText, json, validId } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/me?id=... -> what this player can see
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!validId(id)) return bad("Missing device id");
  const view = playerView(await readState(), id);
  if (!view) return json({ joined: false });
  return json({ joined: true, ...view });
}

// POST /api/me {id, action: "checkin" | "vote", ...}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!validId(body.id)) return bad("Missing device id");
  const id: string = body.id;
  try {
    const err = await mutate((s) => {
      const p = s.players[id];
      if (!p) return "You haven't joined yet";
      if (body.action === "checkin") {
        p.shirt = body.shirt
          ? { size: cleanText(body.shirt.size, 10), teaser: cleanText(body.shirt.teaser) }
          : null;
        p.gift = !!body.gift;
        return null;
      }
      if (body.action === "vote") {
        if (!s.vote.open) return "Voting is closed";
        const target = Object.values(s.players).find((x) => voteKey(x) === body.key);
        if (!target || !target.shirt) return "Can't find that shirt";
        if (target.id === id) return "Nice try, you can't vote for yourself";
        s.vote.votes[id] = target.id;
        return null;
      }
      return "Unknown action";
    });
    if (err) return bad(err);
    return json({ ok: true });
  } catch (e) {
    return bad((e as Error).message, 503);
  }
}
