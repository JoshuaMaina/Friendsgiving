"use client";
import { useEffect, useRef, useState } from "react";

export type Reveal = {
  kind: "shirt" | "gift" | "pick";
  at: number;
  receiver: string;
  from: string;
  teaser: string;
  n: number;
  total: number;
  message?: string;
};

/**
 * Big pop-up when the host reveals the next T-shirt / Secret Santa swap.
 * Shows only reveals that happen while the page is open (not old ones on load),
 * so it can interrupt whatever is on screen, e.g. the spelling bee scoreboard.
 */
export function RevealPopup({ reveals, me }: { reveals?: Reveal[] | null; me?: string }) {
  const seen = useRef<Record<string, number> | null>(null);
  const [shown, setShown] = useState<Reveal | null>(null);

  useEffect(() => {
    if (!reveals) return;
    const latest = Object.fromEntries(reveals.map((r) => [r.kind, r.at]));
    if (seen.current === null) {
      seen.current = latest; // first load: remember, don't pop
      return;
    }
    const fresh = reveals.find((r) => r.at && r.at !== seen.current![r.kind]);
    seen.current = latest;
    if (!fresh) return;
    setShown(fresh);
    if (me && (fresh.receiver === me || (fresh.kind !== "pick" && fresh.from === me))) {
      try { navigator.vibrate?.([200, 80, 200, 80, 200]); } catch {}
    }
  }, [reveals, me]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), shown.message ? 60000 : 15000);
    return () => clearTimeout(t);
  }, [shown]);

  const shirt = shown?.kind === "shirt";
  return (
    // Live region stays mounted so screen readers announce each reveal.
    <div role="status" aria-live="polite">
      {shown && shown.kind === "pick" && (
        <div className="reveal-pop">
          <div className="reveal-card">
            {shown.message ? (
              <>
                <p className="eyebrow" style={{ color: "#13261F" }}>🎁 A special gift</p>
                <p className="reveal-big">{shown.receiver} 💍</p>
                <p className="reveal-line" style={{ whiteSpace: "pre-line" }}>{shown.message}</p>
              </>
            ) : (
              <>
                <p className="eyebrow" style={{ color: "#13261F" }}>🎁 Gift pick · {shown.n} of {shown.total}</p>
                <p className="reveal-big">{shown.receiver},</p>
                <p className="reveal-line">go pick a gift from the pile! 🎁</p>
              </>
            )}
            {shown.from && <p className="reveal-teaser" style={{ marginTop: "0.75rem" }}>Up next: {shown.from}</p>}
            <button type="button" className="btn sm" style={{ marginTop: "1rem", background: "#13261F", color: "#F8F3E6" }} onClick={() => setShown(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {shown && shown.kind !== "pick" && (

        <div className="reveal-pop">
          <div className="reveal-card">
            <p className="eyebrow" style={{ color: "#13261F" }}>
              {shirt ? "👕 Ugly T-shirt swap" : "🎁 Secret Santa"} · {shown.n} of {shown.total}
            </p>
            <p className="reveal-line">{shown.receiver} gets…</p>
            <p className="reveal-big">{shown.from}’s {shirt ? "shirt" : "gift"}!</p>
            {shown.teaser && <p className="reveal-teaser">“{shown.teaser}”</p>}
            <p className="small" style={{ margin: "0.75rem 0 0" }}>
              {shown.receiver} &amp; {shown.from}: come up and swap{shirt ? ", then put it on!" : "!"}
            </p>
            <button type="button" className="btn sm" style={{ marginTop: "1rem", background: "#13261F", color: "#F8F3E6" }} onClick={() => setShown(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
