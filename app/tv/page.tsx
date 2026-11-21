"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { usePoll } from "@/lib/client";
import { activity } from "@/lib/activities";
import { RevealPopup, type Reveal } from "@/components/RevealPopup";

type Pub = {
  now: { activity: string; message: string; at: number; label?: string; emoji?: string };
  playerCount: number;
  musicUrl?: string;
  reveals?: Reveal[];
};

/** Full-screen page for the TV: what's happening now + the join QR. No scrolling, nothing to click. */
export default function TV() {
  const { data } = usePoll<Pub>("/api/public", 3000);
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");
  const [flash, setFlash] = useState(false);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    const u = `${window.location.origin}/join`;
    setUrl(u.replace(/^https?:\/\//, ""));
    QRCode.toDataURL(u, { width: 900, margin: 1, color: { dark: "#13261F", light: "#F8F3E6" } }).then(setSrc);
  }, []);

  const [jamSrc, setJamSrc] = useState("");
  const musicUrl = data?.musicUrl ?? "";
  useEffect(() => {
    if (!musicUrl) { setJamSrc(""); return; }
    QRCode.toDataURL(musicUrl, { width: 400, margin: 1, color: { dark: "#13261F", light: "#F8F3E6" } }).then(setJamSrc);
  }, [musicUrl]);

  const at = data?.now?.at ?? null;
  useEffect(() => {
    if (at === null) return;
    if (seen.current !== null && seen.current !== at) {
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
    }
    seen.current = at;
  }, [at]);

  const act = activity(data?.now);
  return (
    <main className="tv">
      <section className={`tv-now now-card${flash ? " flash" : ""}`} role="status" aria-labelledby="tv-now-title">
        <p className="tv-eyebrow">Friendsgiving 🎄 · Happening now</p>
        <h1 id="tv-now-title" className="tv-title">
          <span aria-hidden="true">{act.emoji}</span> {act.label}
        </h1>
        <p className="tv-msg">{data?.now?.message || act.blurb}</p>
        <div className="tv-foot">
          <p className="tv-count">👥 {data?.playerCount ?? 0} checked in</p>
          {jamSrc && (
            <div className="tv-jam">
              <img src={jamSrc} alt="QR code for the Spotify Jam: scan to add songs" width={400} height={400} />
              <p>🎵 Scan to add songs</p>
            </div>
          )}
        </div>
      </section>
      <section className="tv-qr" aria-labelledby="tv-qr-title">
        <h2 id="tv-qr-title">📱 Scan to join</h2>
        <div className="tv-qr-box">{src && <img src={src} alt={`QR code linking to ${url}`} width={900} height={900} />}</div>
        <p className="tv-url">{url}</p>
      </section>
      <RevealPopup reveals={data?.reveals} />
    </main>
  );
}
