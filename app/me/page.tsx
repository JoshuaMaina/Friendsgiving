"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { getDeviceId, post, usePoll } from "@/lib/client";
import { teamById } from "@/lib/teams";
import { activity } from "@/lib/activities";
import { RevealPopup, type Reveal } from "@/components/RevealPopup";
import { PhotosButton } from "@/components/PhotosButton";

type SwapV =
  | { status: "queue"; done: number; total: number }
  | { status: "waiting"; done: number; total: number; givenAway: string | null }
  | { status: "revealed"; done: number; total: number; givenAway: string | null; from: string; fromTeam: string; teaser: string; size: string }
  | null;
type MeData = {
  joined: boolean;
  now: { activity: string; message: string; at: number; label?: string; emoji?: string };
  me: { name: string; team: string; shirt: { size: string; teaser: string } | null; gift: boolean };
  impostor: { round: number; isImpostor: boolean; word: string | null; category: string | null; impostorCount: number } | null;
  mafia: { round: number; role: "mafia" | "doctor" | "detective" | "villager"; out: boolean; partners: string[] } | null;
  shirtSwap: SwapV;
  giftSwap: SwapV;
  vote: { myVote: string | null; candidates: { key: string; name: string; teaser: string; wornBy: string | null }[] } | null;
};
type Pub = { teams: { id: string; members: string[]; score: number }[]; photosUrl?: string; reveals?: Reveal[] };

const ROLE: Record<string, { title: string; emoji: string; text: string }> = {
  mafia: { title: "Mafia", emoji: "🔪", text: "Each night, agree with the other Mafia who to take out. Act innocent by day." },
  doctor: { title: "Doctor", emoji: "🩺", text: "Each night, choose one person to save (you can save yourself)." },
  detective: { title: "Detective", emoji: "🔎", text: "Each night, point at one person. The host tells you if they’re Mafia." },
  villager: { title: "Villager", emoji: "🏡", text: "Find the Mafia and vote them out before they get everyone." },
};

function Secret({ children, label }: { children: React.ReactNode; label: string }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div className="card light">
      <button type="button" className="btn block" aria-expanded={shown} aria-controls={id} onClick={() => setShown((s) => !s)}>
        {shown ? "Hide my card 🙈" : `${label} 👀`}
      </button>
      {!shown && <p className="muted small" style={{ textAlign: "center", margin: "0.5rem 0 0" }}>Make sure nobody’s looking</p>}
      <div id={id} className="secret" hidden={!shown}>{children}</div>
    </div>
  );
}

function SwapCard({ title, emoji, v, noun }: { title: string; emoji: string; v: SwapV; noun: string }) {
  if (!v) return null;
  return (
    <div className="card gold">
      <p className="eyebrow" style={{ color: "#13261F" }}>{emoji} {title}</p>
      <p className="small" style={{ margin: "0 0 0.5rem" }}>{v.done} of {v.total} revealed so far</p>
      {v.status === "queue" && <p>You’re checked in. The host will add you to the swap shortly.</p>}
      {v.status !== "queue" && v.givenAway && (
        <p><strong>Your {noun} goes to {v.givenAway}.</strong> {noun === "T-shirt" ? "Hand it over!" : "Hope they like it!"}</p>
      )}
      {v.status === "waiting" && <p>Your reveal hasn’t happened yet. Keep this page open: it’ll pop up when it’s your turn 👀</p>}
      {v.status === "revealed" && (
        <>
          <p style={{ margin: 0 }}>You’re getting</p>
          <div className="big-word">{v.from}’s {noun}</div>
          {v.fromTeam && <p className="small">They’re in {teamById(v.fromTeam).name}.</p>}
          {(v.teaser || v.size) && (
            <p className="small">
              {v.teaser && <>“{v.teaser}”</>} {v.size && <span className="pill" style={{ background: "rgba(19,38,31,.12)" }}>Size {v.size}</span>}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CheckIn({ shirt, gift, onSave }: { shirt: boolean; gift: boolean; onSave: (shirt: boolean, gift: boolean) => Promise<void> }) {
  const [sh, setSh] = useState(shirt);
  const [gf, setGf] = useState(gift);
  const [saved, setSaved] = useState("");
  const dirty = sh !== shirt || gf !== gift;
  return (
    <form
      className="card"
      onSubmit={async (e) => { e.preventDefault(); await onSave(sh, gf); setSaved("Saved ✓"); }}
    >
      <fieldset>
        <legend style={{ marginTop: 0 }}>What have you brought?</legend>
        <label className="check" style={{ marginTop: 0 }}>
          <input type="checkbox" name="shirt" checked={sh} onChange={(e) => { setSh(e.target.checked); setSaved(""); }} />
          <span>An ugly T-shirt 👕</span>
        </label>
        <label className="check">
          <input type="checkbox" name="gift" checked={gf} onChange={(e) => { setGf(e.target.checked); setSaved(""); }} />
          <span>A Secret Santa gift 🎁</span>
        </label>
      </fieldset>
      <div className="row" style={{ marginTop: "0.875rem" }}>
        <button type="submit" className="btn sm" disabled={!dirty}>Save check-in</button>
        <span className="small" role="status">{saved}</span>
      </div>
    </form>
  );
}

export default function Me() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(getDeviceId()), []);
  const { data, refresh } = usePoll<MeData>(id ? `/api/me?id=${id}` : null, 3000);
  const { data: pub } = usePoll<Pub>("/api/public", 3000);
  const [flash, setFlash] = useState(false);
  const [err, setErr] = useState("");
  const seen = useRef<string>("");

  // Buzz + flash when something new starts.
  const sig = data?.joined
    ? [data.now?.at, data.impostor?.round, data.mafia?.round, !!data.vote].join("|")
    : "";
  useEffect(() => {
    if (!sig) return;
    if (seen.current && seen.current !== sig) {
      setFlash(true);
      try { navigator.vibrate?.([120, 60, 120]); } catch {}
      window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      setTimeout(() => setFlash(false), 1600);
    }
    seen.current = sig;
  }, [sig]);

  if (!id || !data) return <main className="wrap"><p className="lede">Loading your party page… 🎄</p></main>;
  if (!data.joined)
    return (
      <main className="wrap">
        <h1>Hey! 👋🏾</h1>
        <p className="lede">You haven’t joined on this phone yet.</p>
        <Link className="btn block" href="/join">Join the party →</Link>
      </main>
    );

  const team = teamById(data.me.team);
  const act = activity(data.now);
  const mates = pub?.teams.find((t) => t.id === data.me.team)?.members.filter((n) => n !== data.me.name) ?? [];

  const checkin = async (shirt: boolean, gift: boolean) => {
    setErr("");
    try {
      await post("/api/me", { id, action: "checkin", gift, shirt: shirt ? data.me.shirt ?? { size: "", teaser: "" } : null });
      refresh();
    } catch (e) { setErr((e as Error).message); throw e; }
  };
  const vote = async (key: string) => {
    setErr("");
    try { await post("/api/me", { id, action: "vote", key }); refresh(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <main className="wrap">
      <div className="row between">
        <h1 className="eyebrow" style={{ margin: 0 }}>Hi {data.me.name} 👋🏾 · your party page</h1>
        <span className="pill">Live: updates automatically</span>
      </div>

      <RevealPopup reveals={pub?.reveals} me={data.me.name} />
      {pub?.photosUrl && <PhotosButton url={pub.photosUrl} />}

      {/* Happening now */}
      <section className={`card red now-card${flash ? " flash" : ""}`} role="status" aria-labelledby="now-title">
        <p className="eyebrow" style={{ color: "#F8F3E6" }}>Happening now</p>
        <h2 id="now-title">{act.emoji} {act.label}</h2>
        <p style={{ margin: 0 }}>{data.now?.message || act.blurb}</p>
      </section>

      {/* Impostor */}
      {data.impostor && (
        <div className="card">
          <p className="eyebrow">🕵🏾 Impostor · round {data.impostor.round}</p>
          <Secret label="Show my card">
            {data.impostor.isImpostor ? (
              <>
                <span className="pill" style={{ background: "#B8322A", color: "#F8F3E6" }}>Shh…</span>
                <span className="big-word">You’re the IMPOSTOR</span>
                {data.impostor.category ? <span>The category is <strong>{data.impostor.category}</strong>. Blend in!</span> : <span>No hints. Blend in!</span>}
              </>
            ) : (
              <>
                <span className="muted small">{data.impostor.category}</span>
                <span className="big-word">{data.impostor.word}</span>
                <span className="small">There {data.impostor.impostorCount === 1 ? "is 1 impostor" : `are ${data.impostor.impostorCount} impostors`}. Find them.</span>
              </>
            )}
          </Secret>
        </div>
      )}

      {/* Mafia */}
      {data.mafia && (
        <div className="card">
          <p className="eyebrow">🔪 Mafia · game {data.mafia.round}</p>
          {data.mafia.out && <p className="err" style={{ marginTop: 0 }}>You’re out 💀. Stay quiet and enjoy the chaos.</p>}
          <Secret label="Show my role">
            <span style={{ fontSize: 48 }}>{ROLE[data.mafia.role].emoji}</span>
            <span className="big-word">{ROLE[data.mafia.role].title}</span>
            <span className="small">{ROLE[data.mafia.role].text}</span>
            {data.mafia.partners.length > 0 && <span className="small" style={{ marginTop: 8 }}>Your fellow Mafia: <strong>{data.mafia.partners.join(", ")}</strong></span>}
          </Secret>
        </div>
      )}

      <SwapCard title="Ugly T-shirt swap" emoji="👕" v={data.shirtSwap} noun="T-shirt" />
      <SwapCard title="Secret Santa" emoji="🎁" v={data.giftSwap} noun="gift" />

      {/* Vote */}
      {data.vote && (
        <div className="card">
          <p className="eyebrow">🗳️ Ugliest T-shirt vote</p>
          {data.vote.myVote && <p>You voted for <strong>{data.vote.myVote}</strong>. You can change it until voting closes.</p>}
          {data.vote.candidates.length === 0 && <p className="muted">No shirts to vote for yet.</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {data.vote.candidates.map((c) => (
              <button type="button" key={c.key} className="btn ghost" aria-pressed={data.vote!.myVote === c.name} style={{ justifyContent: "flex-start", textAlign: "start" }} onClick={() => vote(c.key)}>
                <span>
                  {c.name}’s shirt{c.wornBy && <> · worn by {c.wornBy}</>}
                  {c.teaser && <span style={{ fontWeight: 400, fontSize: "0.875rem", display: "block" }}>“{c.teaser}”</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      <div className="team-badge" style={{ background: team.color, color: team.ink, marginTop: 14 }}>
        <div className="emoji">{team.emoji}</div>
        <p className="eyebrow" style={{ color: team.ink, margin: "10px 0 0" }}>You’re in</p>
        <h2>{team.name}</h2>
        {mates.length > 0 && <p style={{ marginTop: 10 }}>With {mates.join(", ")}</p>}
      </div>

      {/* Check-in */}
      <CheckIn key={`${!!data.me.shirt}-${data.me.gift}`} shirt={!!data.me.shirt} gift={data.me.gift} onSave={checkin} />
      <p className="small muted" style={{ textAlign: "center" }}><Link href="/join">Edit name or shirt details</Link> · <Link href="/scores">Scoreboard</Link></p>
      <p className="err" role="alert">{err}</p>
    </main>
  );
}
