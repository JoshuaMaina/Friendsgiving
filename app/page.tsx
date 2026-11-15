"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { getDeviceId, usePoll } from "@/lib/client";
import { activity } from "@/lib/activities";

/** Big join QR, so the home page can sit on the TV. */
function JoinQR() {
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = `${window.location.origin}/join`;
    setUrl(u);
    QRCode.toDataURL(u, { width: 800, margin: 2, color: { dark: "#13261F", light: "#F8F3E6" } }).then(setSrc);
  }, []);
  return (
    <section className="card light qr-card" aria-labelledby="qr-title">
      <h2 id="qr-title">📱 Scan to join</h2>
      <p>Point your phone camera here to get your team.</p>
      <div className="qr-box">
        {src && <img src={src} alt={`QR code linking to ${url}`} width={800} height={800} />}
      </div>
      <p className="qr-url">{url.replace(/^https?:\/\//, "")}</p>
    </section>
  );
}

/** Live "happening now" banner: the host's latest announcement, for the TV and phones. */
function NowBanner() {
  const { data } = usePoll<{ now: { activity: string; message: string; at: number }; playerCount: number }>("/api/public", 4000);
  const [flash, setFlash] = useState(false);
  const seen = useRef<number | null>(null);
  const at = data?.now?.at ?? null;
  useEffect(() => {
    if (at === null) return;
    if (seen.current !== null && seen.current !== at) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
    }
    seen.current = at;
  }, [at]);
  if (!data) return null;
  const act = activity(data.now.activity);
  return (
    <section className={`card red now-card${flash ? " flash" : ""}`} role="status" aria-labelledby="home-now-title">
      <p className="eyebrow" style={{ color: "#F8F3E6" }}>Happening now · {data.playerCount} checked in</p>
      <h2 id="home-now-title" className="now-title">{act.emoji} {act.label}</h2>
      <p className="now-msg">{data.now.message || act.blurb}</p>
    </section>
  );
}

export default function Home() {
  const [joined, setJoined] = useState<boolean | null>(null);
  useEffect(() => {
    fetch(`/api/me?id=${getDeviceId()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setJoined(!!d.joined))
      .catch(() => setJoined(false));
  }, []);

  return (
    <main className="wrap wide home">
      <div className="home-info">
      <p className="eyebrow">Saturday 21 November · 5pm onwards</p>
      <h1>Friendsgiving 🎄</h1>
      <p className="lede">Christmas with friends: games, mulled wine and good vibes.</p>
      <NowBanner />

      <div style={{ margin: "22px 0" }}>
        {joined ? (
          <Link className="btn block" href="/me">Go to my party page →</Link>
        ) : (
          <Link className="btn block" href="/join">Join the party &amp; get your team →</Link>
        )}
        <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
          Keep your party page open on the night. Games, swaps and announcements pop up there live.
        </p>
      </div>

      <div className="card light">
        <h2>🎅🏾 Dress code</h2>
        <p>Festive / Christmassy. Jumpers, Santa hats, full elf, go wild.</p>
      </div>

      <div className="grid2">
        <div className="card gold">
          <h2>🎁 Secret Santa</h2>
          <p>Bring one wrapped gift, max £25 (unless you’re feeling generous 😉). Gifts get swapped at random. Last year ranged from a onesie to a cocktail set to edible lingerie, so anything goes.</p>
        </div>
        <div className="card red">
          <h2>👕 Ugly T-shirt swap</h2>
          <p>Bring the ugliest T-shirt you can find. We swap them at random, and whatever you get, you wear for the rest of the night. Prize for the ugliest one.</p>
        </div>
      </div>

      <div className="card">
        <h2>🎲 On the night</h2>
        <p>🐝 The Great Festive Spelling Bee (in teams)</p>
        <p>🕵🏾 Impostor</p>
        <p>🔪 Mafia</p>
        <p>🍷 Mulled wine, food and a bash to finish</p>
        <p className="muted small">No fixed times. We’ll kick things off as the night goes. Watch your party page.</p>
      </div>

      <p className="muted small" style={{ textAlign: "center", marginTop: "1.875rem" }}>
        Address sent separately to guests 📍
      </p>
      </div>
      <JoinQR />
    </main>
  );
}
