"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/client";

export default function Home() {
  const [joined, setJoined] = useState<boolean | null>(null);
  useEffect(() => {
    fetch(`/api/me?id=${getDeviceId()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setJoined(!!d.joined))
      .catch(() => setJoined(false));
  }, []);

  return (
    <main className="wrap">
      <p className="eyebrow">Saturday 21 November · 5pm onwards</p>
      <h1>Friendsgiving 🎄</h1>
      <p className="lede">Christmas with friends: games, mulled wine and good vibes.</p>

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

      <p className="muted small" style={{ textAlign: "center", marginTop: 30 }}>
        Address sent separately to guests 📍
      </p>
    </main>
  );
}
