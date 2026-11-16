"use client";
import { usePoll } from "@/lib/client";
import { teamById } from "@/lib/teams";
import { activity } from "@/lib/activities";
import { RevealPopup, type Reveal } from "@/components/RevealPopup";

type Pub = {
  teams: { id: string; members: string[]; score: number }[];
  playerCount: number;
  now: { activity: string; message: string; label?: string; emoji?: string };
  reveals?: Reveal[];
};

// Built for the TV: big, live scores.
export default function Scores() {
  const { data } = usePoll<Pub>("/api/public", 3000);
  const sorted = [...(data?.teams ?? [])].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  const act = activity(data?.now);
  return (
    <main className="wrap wide">
      <div className="row between">
        <div>
          <p className="eyebrow">Friendsgiving · live scoreboard</p>
          <h1>🐝 Spelling Bee</h1>
        </div>
        <div className="card red" style={{ margin: 0 }}>
          <strong>{act.emoji} {act.label}</strong>
        </div>
      </div>
      <div className="board" style={{ marginTop: 24 }}>
        {sorted.map((t, i) => {
          const team = teamById(t.id);
          return (
            <div key={t.id} className="team" style={{ background: team.color, color: team.ink }}>
              <div className="row between">
                <h2 style={{ margin: 0 }}>{team.emoji} {team.name}</h2>
                {top > 0 && t.score === top && i === 0 && <span style={{ fontSize: 32 }}>👑</span>}
              </div>
              <div className="score">{t.score}</div>
              <p className="small" style={{ margin: "8px 0 0" }}>{t.members.join(", ") || "No one yet"}</p>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: "1.25rem" }}>{data?.playerCount ?? 0} people checked in</p>
      <RevealPopup reveals={data?.reveals} />
    </main>
  );
}
