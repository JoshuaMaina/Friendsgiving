"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { TEAMS } from "@/lib/teams";
import { ACTIVITIES, activity } from "@/lib/activities";
import { CATEGORIES } from "@/lib/words";
import { post } from "@/lib/client";

type Admin = {
  usingRedis: boolean;
  now: { activity: string; message: string; at: number; label?: string; emoji?: string };
  players: {
    id: string; name: string; team: string; shirt: { size: string; teaser: string } | null; gift: boolean;
    leaving: boolean; pendingShirt: boolean; pendingGift: boolean;
  }[];
  scores: Record<string, number>;
  shirtSwap: SwapA;
  giftSwap: SwapA;
  impostor: { round: number; active: boolean; players: number; mode: "classic" | "undercover"; twist: "similar" | "random" | null };
  mafia: { round: number; active: boolean; roles: { id: string; name: string; role: string; out: boolean }[] };
  vote: { open: boolean; count: number; results: { name: string; votes: number }[] };
  photosUrl: string;
  musicUrl: string;
  activeTeams: number;
  giftPick: { started: boolean; called: number; total: number; current: string | null; next: string | null; order: string[] };
};
type SwapA = {
  started: boolean;
  pairs: { receiver: string; from: string; revealed: boolean }[];
  waiting: string[];
  eligible: number;
  revealedCount: number;
  total: number;
  upNext: string | null;
  last: { receiver: string; from: string } | null;
};

// Native <dialog> confirm, used instead of window.confirm()
type Ask = (title: string, body?: string, ok?: string) => Promise<boolean>;
const ConfirmCtx = createContext<Ask>(async () => false);
const useConfirm = () => useContext(ConfirmCtx);

function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});
  const [text, setText] = useState({ title: "", body: "", ok: "Yes" });
  const ask: Ask = (title, body = "", ok = "Yes, do it") =>
    new Promise((resolve) => {
      resolver.current = resolve;
      setText({ title, body, ok });
      requestAnimationFrame(() => ref.current?.showModal());
    });
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => {
      resolver.current(d.returnValue === "ok");
      d.returnValue = ""; // Esc / light dismiss leave no value: treat as cancel
    };
    d.addEventListener("close", onClose);
    return () => d.removeEventListener("close", onClose);
  }, []);
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <dialog ref={ref} className="confirm" aria-labelledby="confirm-title" {...({ closedby: "any" } as object)}>
        <h2 id="confirm-title">{text.title}</h2>
        {text.body && <p>{text.body}</p>}
        <form method="dialog" className="row">
          <button className="btn ghost sm" value="cancel" autoFocus>Cancel</button>
          <button className="btn red sm" value="ok">{text.ok}</button>
        </form>
      </dialog>
    </ConfirmCtx.Provider>
  );
}

// The spelling bee deck (a Claude Slides artifact; opens for whoever it's shared with).
const SPELLING_BEE_DECK = "https://claude.ai/artifact/66u8GEfbzh42kEN5fSKZAT";

function DeckLink() {
  return (
    <div className="card gold">
      <h3>🐝 Spelling bee slides</h3>
      <p className="small">Open on the TV, present full screen, and click to reveal each spelling. Words and pronunciations are in the speaker notes.</p>
      <a className="btn sm" style={{ background: "#13261F", color: "#F8F3E6" }} href={SPELLING_BEE_DECK} target="_blank" rel="noopener">Open the presentation ↗</a>
    </div>
  );
}

const TABS = ["Launch", "Teams", "Scores", "Impostor", "Mafia", "Swaps", "Vote", "QR"] as const;
type Tab = (typeof TABS)[number];

export default function HostPage() {
  return (
    <ConfirmProvider>
      <Host />
    </ConfirmProvider>
  );
}

function Host() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [s, setS] = useState<Admin | null>(null);
  const [tab, setTab] = useState<Tab>("Launch");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = useConfirm();
  const tablistRef = useRef<HTMLDivElement>(null);

  // focusgroup gives the tablist arrow-key navigation; polyfill only where it's missing.
  useEffect(() => {
    if (!authed || Object.hasOwn(HTMLElement.prototype, "focusGroup")) return;
    import("@microsoft/focusgroup-polyfill/shadowless").then(({ polyfillBodyAndObserve }) => polyfillBodyAndObserve());
  }, [authed]);

  useEffect(() => {
    try {
      const p = sessionStorage.getItem("fg-pin");
      if (p) { setPin(p); setAuthed(true); }
    } catch {}
  }, []);

  const call = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setErr("");
      if (action !== "state") setBusy(true);
      try {
        const d = await post<Admin>("/api/host", { pin, action, ...extra });
        setS(d);
        return true;
      } catch (e) {
        const m = (e as Error).message;
        setErr(m);
        if (m === "Wrong PIN") { setAuthed(false); try { sessionStorage.removeItem("fg-pin"); } catch {} }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [pin],
  );

  // Live refresh while logged in.
  useEffect(() => {
    if (!authed) return;
    call("state");
    const t = setInterval(() => document.visibilityState === "visible" && call("state"), 3000);
    return () => clearInterval(t);
  }, [authed, call]);

  if (!authed)
    return (
      <main className="wrap">
        <p className="eyebrow">Friendsgiving · Host</p>
        <h1>Host dashboard 🎛️</h1>
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await call("state");
            if (ok) { setAuthed(true); try { sessionStorage.setItem("fg-pin", pin); } catch {} }
          }}
        >
          <label htmlFor="pin">Host PIN</label>
          <input id="pin" name="pin" type="password" required autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
          <p className="err" role="alert">{err}</p>
          <button type="submit" className="btn block" style={{ marginTop: "1rem" }}>Open dashboard</button>
        </form>
      </main>
    );

  if (!s) return <main className="wrap"><p>Loading…</p>{err && <p className="err">{err}</p>}</main>;

  const act = activity(s.now);
  const count = s.players.length;

  return (
    <main className="wrap wide">
      <div className="row between">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Host dashboard · {count} checked in</p>
          <h1 style={{ margin: "0.25rem 0 0", fontSize: "1.75rem" }}>Now: {act.emoji} {act.label}</h1>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => { setAuthed(false); try { sessionStorage.removeItem("fg-pin"); } catch {} }}>Log out</button>
      </div>
      {!s.usingRedis && <p className="err">No database connected: data lives in memory and will reset. Add Upstash Redis in Vercel → Storage.</p>}

      <RevealBar s={s} call={call} busy={busy} />
      <div className="tablist" ref={tablistRef} aria-label="Host controls" {...({ focusgroup: "tablist nomemory" } as object)}>
        {TABS.map((t) => (
          <button
            key={t} type="button" id={`tab-${t}`}
            aria-selected={tab === t}
            {...(tab === t ? { focusgroupstart: "" } : {})}
            onClick={(e) => { setTab(t); e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }}
            onFocus={() => setTab(t)}
          >{t}</button>
        ))}
      </div>
      <p className="err" role="alert">{err}</p>

      <Panel id="Launch" tab={tab} setTab={setTab}><Launch s={s} call={call} busy={busy} /></Panel>
      <Panel id="Teams" tab={tab} setTab={setTab}><Teams s={s} call={call} busy={busy} /></Panel>
      <Panel id="Scores" tab={tab} setTab={setTab}><Scores s={s} call={call} busy={busy} /></Panel>
      <Panel id="Impostor" tab={tab} setTab={setTab}><ImpostorTab s={s} call={call} busy={busy} /></Panel>
      <Panel id="Mafia" tab={tab} setTab={setTab}><MafiaTab s={s} call={call} busy={busy} /></Panel>
      <Panel id="Swaps" tab={tab} setTab={setTab}>
        <GiftPickPanel s={s} call={call} busy={busy} />
        <SwapPanel title="👕 Ugly T-shirt swap" sw={s.shirtSwap} kind="shirt" call={call} busy={busy} what="T-shirts" />
        <SwapPanel title="🎁 Secret Santa" sw={s.giftSwap} kind="gift" call={call} busy={busy} what="gifts" />
        <RevealSomeone s={s} call={call} busy={busy} />
      </Panel>
      <Panel id="Vote" tab={tab} setTab={setTab}><VoteTab s={s} call={call} busy={busy} /></Panel>
      <Panel id="QR" tab={tab} setTab={setTab}><QR /></Panel>
    </main>
  );
}

/** Tab panel: inactive panels use hidden="until-found" so find-in-page still reaches them. */
function Panel({ id, tab, setTab, children }: { id: Tab; tab: Tab; setTab: (t: Tab) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    (el as unknown as { hidden: string | boolean }).hidden = tab === id ? false : "until-found";
    const onMatch = () => setTab(id);
    el.addEventListener("beforematch", onMatch);
    return () => el.removeEventListener("beforematch", onMatch);
  }, [tab, id, setTab]);
  return (
    <div ref={ref} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab !== id}>
      <div>{children}</div>
    </div>
  );
}

type P = { s: Admin; call: (a: string, x?: Record<string, unknown>) => Promise<boolean>; busy: boolean };

function Launch({ s, call, busy }: P) {
  const [msg, setMsg] = useState("");
  const ask = useConfirm();
  return (
    <>
      <div className="card">
        <h3>Put up on everyone’s phone</h3>
        <p className="muted small">Tap an activity to make it “Happening now”. Phones buzz and update within a few seconds. Starting a game (Impostor, Mafia, swaps, vote) does this for you.</p>
        <label htmlFor="msg">Optional message</label>
        <input id="msg" type="text" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Food in 5 mins, grab a plate!" maxLength={140} />
        <div className="grid3" style={{ marginTop: 14 }}>
          {Object.entries(ACTIVITIES).map(([id, a]) => (
            <button type="button" key={id} disabled={busy} className={`btn ${s.now.activity === id ? "" : "ghost"}`} onClick={async () => { if (await call("setNow", { activity: id, message: msg })) setMsg(""); }}>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
      </div>
      {s.now.activity === "spellingbee" && <DeckLink />}
      <CustomGame call={call} busy={busy} />
      <div className="grid3">
        <div className="card"><h3>👥 {s.players.length}</h3><p className="muted small">checked in</p></div>
        <div className="card"><h3>👕 {s.players.filter((p) => p.shirt).length}</h3><p className="muted small">brought ugly T-shirts</p></div>
        <div className="card"><h3>🎁 {s.players.filter((p) => p.gift).length}</h3><p className="muted small">brought gifts</p></div>
      </div>
      <p className="muted small">Shortcuts: put the home page or <a href="/scores" target="_blank">/scores</a> on the TV. Both update live.</p>
      <LinkForm s={s} call={call} busy={busy} field="music" />
      <LinkForm s={s} call={call} busy={busy} field="photos" />
      <div className="card">
        <h3>🧹 Start fresh</h3>
        <p className="muted small">Clears every guest, team, score, game, swap and vote. Use after testing, before the party.</p>
        <button type="button" className="btn red sm" disabled={busy} onClick={async () => (await ask("Reset everything?", "All guests, teams, scores, games, swaps and votes are deleted. This can’t be undone.", "Reset everything")) && call("resetAll", { confirm: "RESET" })}>Reset everything</button>
      </div>
    </>
  );
}

/** How many teams are in play. New guests only join these; grow it as more people arrive. */
function TeamsInPlay({ s, call, busy }: P) {
  const [n, setN] = useState(s.activeTeams);
  const [spread, setSpread] = useState(true);
  const count = s.players.length;
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); call("setActiveTeams", { count: n, balance: spread }); }}>
      <fieldset>
        <legend style={{ marginTop: 0 }}>Teams in play</legend>
        <p className="muted small" style={{ marginTop: 0 }}>
          New guests only join these teams. Start small (e.g. 2 teams for 10 people), then add teams as more people arrive. {count} checked in: about {Math.ceil(count / Math.max(1, n))} per team with {n}.
        </p>
        <div className="radios">
          {TEAMS.map((t, i) => (
            <label key={t.id}><input type="radio" name="teams-in-play" value={i + 1} checked={n === i + 1} onChange={() => setN(i + 1)} />{i + 1}</label>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={spread} onChange={(e) => setSpread(e.target.checked)} />
        <span>Also spread people out now (moves as few people as possible)</span>
      </label>
      <button type="submit" className="btn sm" style={{ marginTop: "0.875rem" }} disabled={busy || (n === s.activeTeams && !spread)}>Apply</button>
    </form>
  );
}

function Teams({ s, call, busy }: P) {
  const ask = useConfirm();
  return (
    <>
      <TeamsInPlay s={s} call={call} busy={busy} />
      <div className="row" style={{ margin: "0.75rem 0" }}>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={() => call("balance")}>⚖️ Even out teams</button>
        <button type="button" className="btn sm ghost" disabled={busy} onClick={async () => (await ask("Reshuffle everyone?", `Everyone gets dealt into ${s.activeTeams} new, even teams at random.`, "Reshuffle")) && call("reshuffle")}>🔀 Reshuffle everyone</button>
      </div>
      <div className="grid3">
        {TEAMS.filter((t, i) => i < s.activeTeams || s.players.some((p) => p.team === t.id)).map((t) => {
          const members = s.players.filter((p) => p.team === t.id);
          return (
            <div key={t.id} className="card" style={{ borderTop: `6px solid ${t.color}` }}>
              <h3>{t.emoji} {t.name} <span className="pill">{members.length}</span></h3>
              <table className="list"><tbody>
                {members.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name} {p.shirt ? "👕" : ""}{p.gift ? "🎁" : ""}</td>
                    <td style={{ width: 120 }}>
                      <select value={p.team} disabled={busy} onChange={(e) => call("moveTeam", { playerId: p.id, team: e.target.value })}>
                        {TEAMS.map((x) => <option key={x.id} value={x.id}>{x.name.replace("Team ", "")}</option>)}
                      </select>
                    </td>
                    <td style={{ width: 30 }}>
                      <button type="button" className="btn ghost sm" style={{ padding: "4px 9px" }} aria-label={`Remove ${p.name}`} onClick={async () => (await ask(`Remove ${p.name}?`, "Only for test entries or mistakes. Don’t remove people who’ve gone home: their shirt and gift are already part of the swap.", "Remove")) && call("removePlayer", { playerId: p.id })}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Scores({ s, call, busy }: P) {
  const ask = useConfirm();
  return (
    <>
      <DeckLink />
      <p className="muted small" style={{ marginTop: 12 }}>Round 1 = 1 pt, Round 2 = 2 pts, Round 3 = 3 pts, steals = 1 pt. Live on <a href="/scores" target="_blank">/scores</a>.</p>
      <div className="grid3">
        {TEAMS.map((t) => (
          <div key={t.id} className="card" style={{ background: t.color, color: t.ink }}>
            <h3>{t.emoji} {t.name}</h3>
            <div style={{ font: "600 52px Fredoka, sans-serif" }}>{s.scores[t.id] ?? 0}</div>
            <div className="row" style={{ marginTop: 8 }}>
              {[1, 2, 3].map((d) => <button type="button" key={d} className="btn sm" style={{ background: "#13261F", color: "#F8F3E6" }} disabled={busy} onClick={() => call("addScore", { team: t.id, delta: d })}>+{d}</button>)}
              <button type="button" className="btn sm" style={{ background: "rgba(19,38,31,.2)", color: t.ink }} disabled={busy} onClick={() => call("addScore", { team: t.id, delta: -1 })}>−1</button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost sm" onClick={async () => (await ask("Reset all scores to 0?", "", "Reset scores")) && call("resetScores")}>Reset scores</button>
    </>
  );
}

function ImpostorTab({ s, call, busy }: P) {
  const [mode, setMode] = useState<"undercover" | "classic">("undercover");
  const [twist, setTwist] = useState<"random" | "similar">("random");
  const [count, setCount] = useState<number | "surprise">("surprise");
  const [cat, setCat] = useState("");
  const [showCat, setShowCat] = useState(true);
  const [answer, setAnswer] = useState<{ word: string; impostorWord: string | null; category: string; impostors: string[] } | null>(null);
  const [pin] = useState(() => { try { return sessionStorage.getItem("fg-pin") || ""; } catch { return ""; } });
  const im = s.impostor;
  const reveal = async () => {
    try { setAnswer(await post("/api/host", { pin, action: "impostorAnswer" })); } catch {}
  };
  return (
    <>
      <form className="card" onSubmit={(e) => { e.preventDefault(); setAnswer(null); call("impostorStart", { count, category: cat, showCategory: showCat, mode, twist }); }}>
        <h3>Start a round</h3>
        <fieldset>
          <legend style={{ marginTop: 0 }}>Game style</legend>
          <div className="radios">
            <label><input type="radio" name="imp-mode" checked={mode === "undercover"} onChange={() => setMode("undercover")} />🤫 Undercover</label>
            <label><input type="radio" name="imp-mode" checked={mode === "classic"} onChange={() => setMode("classic")} />🕵🏾 Classic</label>
          </div>
          <p className="hint">
            {mode === "undercover"
              ? "Everyone just sees “your word”. Impostors get a different word and aren’t told. Nobody, not even you, knows who or how many. Work it out from the clues."
              : "Everyone sees the same word; impostors are told they’re the impostor and get no word (just the category, if you allow it)."}
          </p>
        </fieldset>
        {mode === "undercover" && (
          <fieldset>
            <legend>Impostors’ word</legend>
            <div className="radios">
              <label><input type="radio" name="imp-twist" checked={twist === "random"} onChange={() => setTwist("random")} />🌌 Totally random</label>
              <label><input type="radio" name="imp-twist" checked={twist === "similar"} onChange={() => setTwist("similar")} />🦍 Similar</label>
            </div>
            <p className="hint">{twist === "random" ? "e.g. crowd: Chimpanzee, impostor: The universe. Chaotic and funny." : "e.g. crowd: Chimpanzee, impostor: Gorilla. Sneaky: impostors may not realise for ages."}</p>
          </fieldset>
        )}
        <fieldset>
          <legend>Impostors</legend>
          <div className="radios">
            <label><input type="radio" name="impostors" checked={count === "surprise"} onChange={() => setCount("surprise")} />🎲 Surprise (1–3)</label>
            {[1, 2, 3, 4].map((n) => (
              <label key={n}><input type="radio" name="impostors" value={n} checked={count === n} onChange={() => setCount(n)} />{n}</label>
            ))}
          </div>
          {count === "surprise" && <p className="hint">The site picks secretly, so you can play too.</p>}
        </fieldset>
        {!(mode === "undercover" && twist === "similar") && (
          <div className="grid2">
            <div>
              <label htmlFor="imp-cat">Category</label>
              <select id="imp-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">Random</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {mode === "classic" && (
              <label className="check" style={{ marginTop: "2.5rem" }}>
                <input type="checkbox" checked={showCat} onChange={(e) => setShowCat(e.target.checked)} />
                <span>Impostors see category</span>
              </label>
            )}
          </div>
        )}
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn" disabled={busy}>{im.active ? "🔁 New round" : "▶️ Start round"}</button>
          {im.active && <button type="button" className="btn ghost" disabled={busy} onClick={() => call("impostorEnd")}>⏹ End game</button>}
        </div>
      </form>
      {im.active && (
        <div className="card light">
          <p className="eyebrow" style={{ color: "#B8322A" }}>Round {im.round} · {im.players} players · {im.mode === "undercover" ? "Undercover" : "Classic"}</p>
          <p className="small">You get a card on your phone like everyone else. The answer stays hidden until you reveal it.</p>
          {answer ? (
            <>
              <p>Crowd’s word: <strong>{answer.word}</strong>{answer.impostorWord && <> · Impostors’ word: <strong>{answer.impostorWord}</strong></>}</p>
              <p>Impostor{answer.impostors.length === 1 ? "" : "s"} ({answer.impostors.length}): <strong>{answer.impostors.join(", ")}</strong></p>
              <button type="button" className="btn ghost sm" onClick={() => setAnswer(null)}>Hide</button>
            </>
          ) : (
            <button type="button" className="btn sm" onClick={reveal}>👀 Reveal answer (end of round)</button>
          )}
        </div>
      )}
    </>
  );
}

function MafiaTab({ s, call, busy }: P) {
  const ask = useConfirm();
  const n = s.players.length;
  const [mafia, setMafia] = useState(Math.max(1, Math.round(n / 5)));
  const [doctor, setDoctor] = useState(true);
  const [detective, setDetective] = useState(true);
  const [peek, setPeek] = useState(false);
  const m = s.mafia;
  const alive = m.roles.filter((r) => !r.out);
  const aliveMafia = alive.filter((r) => r.role === "mafia").length;
  return (
    <>
      <div className="card">
        <h3>Deal roles</h3>
        <p className="muted small">Rule of thumb: about 1 Mafia per 5 players ({n} checked in, so {Math.max(1, Math.round(n / 5))}). You narrate. The site just deals the roles secretly.</p>
        <div className="grid3">
          <div>
            <label htmlFor="mafia-n">Mafia players</label>
            <select id="mafia-n" value={mafia} onChange={(e) => setMafia(Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => i + 1).map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <label className="check" style={{ marginTop: 40 }}><input type="checkbox" checked={doctor} onChange={(e) => setDoctor(e.target.checked)} /><span>Doctor 🩺</span></label>
          <label className="check" style={{ marginTop: 40 }}><input type="checkbox" checked={detective} onChange={(e) => setDetective(e.target.checked)} /><span>Detective 🔎</span></label>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn" disabled={busy} onClick={async () => { setPeek(false); if (await ask(m.active ? "Deal a new game?" : "Deal roles to everyone?", m.active ? "Current roles are replaced." : "", "Deal")) call("mafiaStart", { mafia, doctor, detective }); }}>
            {m.active ? "🔁 New game" : "▶️ Deal roles"}
          </button>
          {m.active && <button type="button" className="btn ghost" disabled={busy} onClick={() => call("mafiaEnd")}>⏹ End game</button>}
        </div>
      </div>
      {m.active && (
        <div className="card">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Game {m.round}: {alive.length} alive · {aliveMafia} Mafia left</h3>
            <button type="button" className="btn ghost sm" onClick={() => setPeek((p) => !p)}>{peek ? "Hide roles" : "👀 Show roles"}</button>
          </div>
          {aliveMafia === 0 && <p className="pill" style={{ background: "#2E7D4F", marginTop: 10 }}>Villagers win! 🎉</p>}
          {aliveMafia > 0 && aliveMafia >= alive.length - aliveMafia && <p className="pill" style={{ background: "#B8322A", marginTop: 10 }}>Mafia win! 🔪</p>}
          <p className="muted small" style={{ marginTop: 10 }}>Tap a name to mark them out (or back in).</p>
          <div className="grid3">
            {m.roles.map((r) => (
              <button type="button" key={r.id} aria-pressed={r.out} className={`btn sm ${r.out ? "red" : "ghost"}`} onClick={() => call("mafiaToggleOut", { playerId: r.id })} style={{ textDecoration: r.out ? "line-through" : "none" }}>
                {r.name}{r.out && <span className="visually-hidden"> (out)</span>}{peek && ` · ${r.role === "mafia" ? "🔪" : r.role === "doctor" ? "🩺" : r.role === "detective" ? "🔎" : "🏡"}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SwapPanel({ title, sw, kind, call, busy, what }: { title: string; sw: SwapA; kind: "shirt" | "gift"; call: P["call"]; busy: boolean; what: string }) {
  const ask = useConfirm();
  const [show, setShow] = useState(false);
  const key = kind === "shirt" ? "shirtSwap" : "giftSwap";
  const left = sw.total - sw.revealedCount;
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted small">
        {sw.eligible} checked in with {what}. Start it as soon as 2 people have checked in: matches are made in secret (never their own), and anyone who checks in later is added automatically. Reveal them one at a time whenever you like, even mid-spelling-bee; each reveal pops up on the TV and every phone. If everyone’s been revealed and someone new arrives, they “steal” from someone already revealed, and both get a new pop-up.
      </p>
      {sw.waiting.length > 0 && <p className="pill" style={{ background: "#B8322A" }}>{sw.waiting.length} not in the swap yet: {sw.waiting.join(", ")}</p>}
      <div className="row" style={{ marginTop: "0.75rem" }}>
        {!sw.started ? (
          <button type="button" className="btn" disabled={busy || sw.eligible < 2} onClick={() => call(key)}>▶️ Start swap</button>
        ) : (
          <>
            <button type="button" className="btn" disabled={busy || left === 0} onClick={() => call(kind === "shirt" ? "shirtReveal" : "giftReveal")}>
              {left === 0 ? "✅ All revealed" : `🎲 Reveal next (${sw.revealedCount + 1} of ${sw.total})`}
            </button>
            {sw.waiting.length > 0 && <button type="button" className="btn ghost sm" disabled={busy} onClick={() => call(key)}>➕ Add {sw.waiting.length} latecomer(s)</button>}
            {left > 1 && (
              <button type="button" className="btn ghost sm" disabled={busy} onClick={async () => (await ask(`Reveal all ${left} remaining?`, "Everyone sees their match at once on their phone.", "Reveal all")) && call(kind === "shirt" ? "shirtRevealAll" : "giftRevealAll")}>
                ⏩ Reveal all remaining
              </button>
            )}
          </>
        )}
      </div>
      {sw.started && (
        <p className="small" style={{ marginTop: "0.75rem" }}>
          {sw.last && <>Last: <strong>{sw.last.receiver}</strong> got {sw.last.from}’s. </>}
          {left > 0 && (sw.upNext ? <>Up next: <strong>{sw.upNext}</strong>.</> : <>Next one is picked at random.</>)}
        </p>
      )}
      {sw.started && (
        <div className="row">
          <button type="button" className="btn ghost sm" onClick={() => setShow((x) => !x)}>{show ? "Hide" : "Show"} all matches (spoilers!)</button>
          <button type="button" className="btn ghost sm" onClick={async () => (await ask(`Reset the ${what} swap?`, "Everyone loses their match and reveals start over.", "Reset")) && call(kind === "shirt" ? "shirtSwapReset" : "giftSwapReset")}>Reset</button>
        </div>
      )}
      {show && (
        <table className="list" style={{ marginTop: "0.75rem" }}><tbody>
          {sw.pairs.map((p) => <tr key={p.receiver}><td>{p.revealed ? "✅" : "⏳"} {p.receiver}</td><td>gets {p.from}’s</td></tr>)}
        </tbody></table>
      )}
    </div>
  );
}

/** A game that isn't built in: name it, put it up as "happening now". */
function CustomGame({ call, busy }: { call: P["call"]; busy: boolean }) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [msg, setMsg] = useState("");
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await call("setNow", { activity: "custom", label, emoji, message: msg })) { setLabel(""); setMsg(""); }
      }}
    >
      <h3>➕ Another game</h3>
      <p className="muted small">For anything not on the list (charades, beer pong, a dance-off…). It goes up as “Happening now” on the TV and phones.</p>
      <div className="grid3">
        <div>
          <label htmlFor="cg-name">Game name <span aria-hidden="true">*</span></label>
          <input id="cg-name" name="cg-name" type="text" required maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cg-emoji">Emoji</label>
          <input id="cg-emoji" name="cg-emoji" type="text" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cg-msg">Message (optional)</label>
          <input id="cg-msg" name="cg-msg" type="text" maxLength={140} value={msg} onChange={(e) => setMsg(e.target.value)} aria-describedby="cg-msg-hint" />
          <p id="cg-msg-hint" className="hint">e.g. “Teams of 2, meet by the kitchen”</p>
        </div>
      </div>
      <button type="submit" className="btn sm" style={{ marginTop: "0.875rem" }} disabled={busy}>▶️ Put it up now</button>
    </form>
  );
}

function LinkForm({ s, call, busy, field }: P & { field: "photos" | "music" }) {
  const current = field === "photos" ? s.photosUrl : s.musicUrl;
  const [url, setUrl] = useState(current);
  const [saved, setSaved] = useState("");
  const id = `${field}-url`;
  return (
    <form
      className="card"
      onSubmit={async (e) => { e.preventDefault(); if (await call(field === "photos" ? "setPhotos" : "setMusic", { url })) setSaved(url ? "Saved: live now ✓" : "Removed ✓"); }}
    >
      <h3>{field === "photos" ? "📸 Shared photo album" : "🎵 Spotify Jam"}</h3>
      <label htmlFor={id}>{field === "photos" ? "Album link" : "Jam link"}</label>
      <input id={id} name={id} type="url" inputMode="url" autoComplete="url" value={url} onChange={(e) => { setUrl(e.target.value); setSaved(""); }} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className="hint">
        {field === "photos"
          ? "Shows an “Add your photos” button on the home page and everyone’s party page. Leave empty to hide it."
          : "Spotify → devices icon → Start a Jam → Share link. Shows an “Add songs” QR on /tv and a button on party pages. If you restart the Jam, paste the new link here."}
      </p>
      <div className="row" style={{ marginTop: "0.75rem" }}>
        <button type="submit" className="btn sm" disabled={busy || url === current}>Save link</button>
        <span className="small" role="status">{saved}</span>
      </div>
    </form>
  );
}

/** Always-visible reveal buttons, so a reveal can happen from any tab (e.g. during the spelling bee). */
function RevealBar({ s, call, busy }: P) {
  const items = (
    [
      ["shirt", "👕 Next shirt reveal", s.shirtSwap],
      ["gift", "🎁 Next Secret Santa", s.giftSwap],
    ] as const
  ).filter(([, , sw]) => sw.started && sw.revealedCount < sw.total);
  const leaving = s.players.filter((p) => p.leaving);
  const gp = s.giftPick;
  const pickLive = gp.started && gp.called < gp.total;
  if (!items.length && !leaving.length && !pickLive) return null;
  return (
    <div className="reveal-bar">
      {leaving.map((p) => {
        const notStarted = (!!p.shirt && !s.shirtSwap.started) || (p.gift && !s.giftSwap.started);
        return (
          <div key={p.id} className="leaving-chip" role="group" aria-label={`${p.name} is heading off`}>
            <span>🚪 <strong>{p.name}</strong> is heading off</span>
            {(p.pendingShirt || p.pendingGift) && (
              <button type="button" className="btn sm" disabled={busy} onClick={() => call("revealPerson", { playerId: p.id })}>
                Reveal their {[p.pendingShirt && "shirt", p.pendingGift && "gift"].filter(Boolean).join(" + ")} now
              </button>
            )}
            {notStarted && <span className="small">Start the swap on the Swaps tab first</span>}
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => call("clearLeaving", { playerId: p.id })}>Dismiss</button>
          </div>
        );
      })}
      {pickLive && (
        <button type="button" className="btn sm" disabled={busy} onClick={() => call("giftPickNext")}>
          🎁 Next picker ({gp.called + 1}/{gp.total}){gp.next ? ` · ${gp.next}` : ""}
        </button>
      )}
      {items.map(([kind, label, sw]) => (
        <button key={kind} type="button" className="btn sm" disabled={busy} onClick={() => call(kind === "shirt" ? "shirtReveal" : "giftReveal")}>
          {label} ({sw.revealedCount + 1}/{sw.total}){sw.upNext ? ` · ${sw.upNext}` : ""}
        </button>
      ))}
    </div>
  );
}

/** Gifts in a pile: random turn order, host calls the next person up. */
function GiftPickPanel({ s, call, busy }: P) {
  const ask = useConfirm();
  const gp = s.giftPick;
  const [show, setShow] = useState(false);
  return (
    <div className="card">
      <h3>🎁 Gift pick (from the pile)</h3>
      <p className="muted small">Everyone checked in ({s.players.length}) gets a random turn. Each press calls the next person up on the TV and their phone buzzes. Late arrivals slot into the remaining order automatically.</p>
      <div className="row" style={{ marginTop: "0.75rem" }}>
        {!gp.started ? (
          <button type="button" className="btn" disabled={busy || s.players.length < 2} onClick={() => call("giftPickStart")}>▶️ Make the order</button>
        ) : (
          <>
            <button type="button" className="btn" disabled={busy || gp.called >= gp.total} onClick={() => call("giftPickNext")}>
              {gp.called >= gp.total ? "✅ Everyone’s picked" : `🎁 Call next picker (${gp.called + 1} of ${gp.total})${gp.next ? ` · ${gp.next}` : ""}`}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setShow((x) => !x)}>{show ? "Hide" : "Show"} order</button>
            <button type="button" className="btn ghost sm" onClick={async () => (await ask("Reset the gift pick?", "A new random order will be made.", "Reset")) && call("giftPickReset")}>Reset</button>
          </>
        )}
      </div>
      {gp.started && gp.current && <p className="small" style={{ marginTop: "0.75rem" }}>Now picking: <strong>{gp.current}</strong>{gp.next && <> · Up next: <strong>{gp.next}</strong></>}</p>}
      {show && <ol className="small">{gp.order.map((n, i) => <li key={i}>{i < gp.called ? "✅ " : ""}{n}</li>)}</ol>}
    </div>
  );
}

/** Reveal one particular guest now, out of turn (e.g. they're leaving and didn't tap the button). */
function RevealSomeone({ s, call, busy }: P) {
  const pending = s.players.filter((p) => p.pendingShirt || p.pendingGift);
  const [id, setId] = useState("");
  if (!pending.length) return null;
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); if (id) call("revealPerson", { playerId: id }); setId(""); }}>
      <h3>🚪 Reveal someone now</h3>
      <p className="muted small">For anyone leaving early: reveals their shirt and gift straight away, out of turn. Guests can also tap “Heading off soon?” on their phone; they’ll pop up at the top here.</p>
      <label htmlFor="reveal-who">Guest</label>
      <select id="reveal-who" name="reveal-who" required value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Choose…</option>
        {pending.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({[p.pendingShirt && "shirt", p.pendingGift && "gift"].filter(Boolean).join(" + ")})</option>
        ))}
      </select>
      <button type="submit" className="btn sm" style={{ marginTop: "0.75rem" }} disabled={busy}>Reveal now</button>
    </form>
  );
}

function VoteTab({ s, call, busy }: P) {
  const ask = useConfirm();
  const v = s.vote;
  return (
    <div className="card">
      <h3>🗳️ Ugliest T-shirt</h3>
      <p className="muted small">Everyone votes on their phone for anyone who brought a shirt (not themselves). {v.count} votes so far.</p>
      <div className="row" style={{ margin: "12px 0" }}>
        {!v.open ? <button type="button" className="btn" disabled={busy} onClick={() => call("voteOpen")}>▶️ Open voting</button> : <button type="button" className="btn red" disabled={busy} onClick={() => call("voteClose")}>⏹ Close voting</button>}
        <button type="button" className="btn ghost sm" onClick={async () => (await ask("Clear all votes?", "", "Clear votes")) && call("voteReset")}>Reset</button>
      </div>
      <table className="list"><tbody>
        {v.results.map((r, i) => <tr key={r.name}><td>{i === 0 ? "👑 " : ""}{r.name}</td><td>{r.votes} vote{r.votes === 1 ? "" : "s"}</td></tr>)}
      </tbody></table>
    </div>
  );
}

function QR() {
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = `${window.location.origin}/join`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 720, margin: 2, color: { dark: "#13261F", light: "#F8F3E6" } }).then(setSrc);
  }, []);
  return (
    <div className="card light" style={{ textAlign: "center" }}>
      <h2>Scan to join the party 🎄</h2>
      {src && <img src={src} alt={`QR code linking to ${url}`} width={720} height={720} style={{ inlineSize: "min(100%, 32rem)", blockSize: "auto" }} />}
      <p style={{ fontWeight: 700 }}>{url}</p>
      <p className="muted small">Put this on the TV or a phone screen, or screenshot it and print it.</p>
    </div>
  );
}

