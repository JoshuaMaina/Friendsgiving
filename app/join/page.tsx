"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeviceId, post } from "@/lib/client";

export default function Join() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shirt, setShirt] = useState(false);
  const [size, setSize] = useState("");
  const [teaser, setTeaser] = useState("");
  const [gift, setGift] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const errRef = useRef<HTMLParagraphElement>(null);

  // Already joined on this phone? Prefill so they can update.
  useEffect(() => {
    fetch(`/api/me?id=${getDeviceId()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.joined) return;
        setName(d.me.name);
        setShirt(!!d.me.shirt);
        setSize(d.me.shirt?.size ?? "");
        setTeaser(d.me.shirt?.teaser ?? "");
        setGift(d.me.gift);
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // native `required` validation has already run by now
    setErr("");
    setBusy(true); // disable only after a valid submit, to stop double-posts
    try {
      await post("/api/join", { id: getDeviceId(), name, gift, shirt: shirt ? { size, teaser } : null });
      router.push("/me");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      requestAnimationFrame(() => errRef.current?.focus());
    }
  };

  return (
    <main className="wrap">
      <p className="eyebrow">Friendsgiving · Join</p>
      <h1 id="join-title">Join the party 🎉</h1>
      <p className="lede">Pop your name in and we’ll put you in a team.</p>
      <form className="card" method="post" action="/api/join" onSubmit={submit} aria-labelledby="join-title">
        <label htmlFor="name">Your name <span aria-hidden="true">*</span></label>
        <input
          id="name" name="name" type="text" required maxLength={30}
          autoComplete="given-name" enterKeyHint="done" aria-describedby="name-hint"
          value={name}
          onChange={(e) => { e.target.setCustomValidity(""); setName(e.target.value); }}
          onInvalid={(e) => e.currentTarget.setCustomValidity("Please enter your name so we can put you in a team.")}
        />
        <p id="name-hint" className="hint">First name is fine.</p>

        <fieldset>
          <legend>What have you brought?</legend>
          <label className="check" style={{ marginTop: 0 }}>
            <input type="checkbox" name="shirt" checked={shirt} onChange={(e) => setShirt(e.target.checked)} />
            <span>An ugly T-shirt 👕</span>
          </label>
          {shirt && (
            <div className="grid2">
              <div>
                <label htmlFor="size">Shirt size</label>
                <select id="size" name="size" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">Not sure</option>
                  {["XS", "S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="teaser">One-line teaser</label>
                <input id="teaser" name="teaser" type="text" maxLength={80} aria-describedby="teaser-hint" value={teaser} onChange={(e) => setTeaser(e.target.value)} />
                <p id="teaser-hint" className="hint">e.g. “Sequinned reindeer”</p>
              </div>
            </div>
          )}
          <label className="check">
            <input type="checkbox" name="gift" checked={gift} onChange={(e) => setGift(e.target.checked)} />
            <span>A Secret Santa gift 🎁</span>
          </label>
        </fieldset>

        <p ref={errRef} className="err" role="alert" tabIndex={-1}>{err}</p>
        <button type="submit" className="btn block" style={{ marginTop: "1.375rem" }} disabled={busy}>
          {busy ? "Finding your team…" : "Get my team"}
        </button>
        <p className="muted small" style={{ marginTop: "0.625rem" }}>Forgot your shirt or gift? You can tick these later on your party page.</p>
      </form>
    </main>
  );
}
