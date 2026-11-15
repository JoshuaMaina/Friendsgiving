import { readState } from "@/lib/store";
import { publicView } from "@/lib/state";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(publicView(await readState()));
}
