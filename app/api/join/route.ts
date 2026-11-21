import { mutate } from "@/lib/store";
import { pickTeam, syncGiftPick, syncSwaps } from "@/lib/state";
import { bad, cleanName, cleanText, json, validId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { id } = body;
  const name = cleanName(body.name);
  if (!validId(id)) return bad("Missing device id");
  if (!name) return bad("Please enter your name");
  const shirt = body.shirt
    ? { size: cleanText(body.shirt.size, 10), teaser: cleanText(body.shirt.teaser) }
    : null;
  try {
    const team = await mutate((s) => {
      const existing = s.players[id];
      if (existing) {
        existing.name = name;
        existing.shirt = shirt;
        existing.gift = !!body.gift;
        syncSwaps(s);
        return existing.team;
      }
      const team = pickTeam(s);
      s.players[id] = { id, name, team, joinedAt: Date.now(), shirt, gift: !!body.gift };
      syncSwaps(s); // swaps already running? latecomers are added automatically
      syncGiftPick(s);
      return team;
    });
    return json({ team });
  } catch (e) {
    return bad((e as Error).message, 503);
  }
}
