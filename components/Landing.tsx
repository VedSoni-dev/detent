"use client";
import { useEffect, useState } from "react";
import Detent from "@/components/Detent";
import Mark from "@/components/Mark";
import { Footer } from "@/components/Playground";
import { PublikPitch } from "@/components/PublikGate";
import { describeDevice } from "@/lib/detent.js";

function Pending() {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    fetch("/api/publik/status", { cache: "no-store" }).then((r) => r.json()).then((j) => setPending(j?.state === "pending")).catch(() => {});
  }, []);
  if (!pending) return null;
  return <p className="lp-pending">detent is coming to publik (publik caps new listings each week). Until its listing is up, the app is open to everyone with no sign-in.</p>;
}

function Film() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    fetch("/detent.mp4", { method: "HEAD" }).then((r) => setHas(r.ok && (r.headers.get("content-type") ?? "").startsWith("video"))).catch(() => {});
  }, []);
  if (!has) return null;
  return (
    <div className="lp-film">
      <video src="/detent.mp4" poster="/opengraph-image.png" controls preload="none" playsInline aria-label="The detent launch film" />
    </div>
  );
}

function HeroQr() {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    import("qrcode-generator").then(({ default: qrcode }) => {
      const q = qrcode(0, "M"); q.addData(location.origin + "/"); q.make();
      setSvg(q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }));
    }).catch(() => {});
  }, []);
  if (!svg) return null;
  return (
    <div className="lp-qr">
      <div className="qr-img" role="img" aria-label="QR code to open detent on your phone" dangerouslySetInnerHTML={{ __html: svg }} />
      <p><b>On a computer?</b> Scan this and drag it on your phone. That&apos;s where it clicks.</p>
    </div>
  );
}

export default function Landing() {
  const [value, setValue] = useState(7);
  const [clicks, setClicks] = useState(0);
  const [device, setDevice] = useState("Drag the cap. Every whole number clicks.");
  useEffect(() => setDevice(describeDevice({ haptics: true, sound: false })), []);

  return (
    <div className="lp">
      <header className="top">
        <a href="/" className="brand"><Mark /> detent</a>
        <nav className="top-r">
          <a className="btn ghost" href="https://github.com/VedSoni-dev/detent" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a className="btn primary" href="/app">Open detent →</a>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-copy">
            <p className="eyebrow">Free and open source · after a design by Max Yan</p>
            <h1>A slider you can feel.</h1>
            <p className="lede">
              It clicks at every whole number: a buzz under your thumb on Android, a pop on screen everywhere.
              Make it yours, then copy one file into your own web app.
            </p>
            <div className="row">
              <a className="btn primary big" href="/app">Make your slider →</a>
              <a className="btn big" href="/detent.js" download>Download detent.js</a>
            </div>
          </div>
          <div className="lp-demo">
            <div className="stage hero-stage">
              <Detent label="How was it?" min={0} max={10} step={0.1} value={7} onChange={setValue} onDetent={() => setClicks((c) => c + 1)} />
              <p className="device">{device}</p>
              <p className="muted mono tickcount">{value.toFixed(1)} · {clicks} {clicks === 1 ? "click" : "clicks"}</p>
            </div>
            <HeroQr />
          </div>
        </section>

        <section className="lp-points" aria-label="What it does">
          <div>
            <h2>Clicks where it counts</h2>
            <p>It moves in tenths but clicks only on the whole numbers, once each way. A fast fling clicks once, not ten times.</p>
          </div>
          <div>
            <h2>Feels like a real cap</h2>
            <p>The cap lifts when you grab it, stretches past the ends, and springs back when you let go. Tap anywhere on the track to jump there.</p>
          </div>
          <div>
            <h2>Yours to keep</h2>
            <p>Change the words, range, clicks, colour and cap, or describe it in a sentence. Copy React or HTML. One file, no dependencies, MIT.</p>
          </div>
        </section>

        <section className="lp-devices" aria-labelledby="dev-h">
          <h2 id="dev-h">What each device does, honestly</h2>
          <dl>
            <div><dt>Android phones</dt><dd>Vibrates at every whole number, plus a short buzz when you grab the cap.</dd></div>
            <div><dt>iPhone</dt><dd>Safari has no vibration API. It may tick when you tap the cap; while you drag, each number pops on screen, with an optional click sound.</dd></div>
            <div><dt>Computers</dt><dd>A pop on screen and an optional click sound. Arrow keys, Page Up and Down, Home and End all work.</dd></div>
          </dl>
          <p className="muted">The app tells you which of these you&apos;re getting, on the device you&apos;re holding.</p>
        </section>

        <section className="lp-free" aria-labelledby="free-h">
          <div>
            <h2 id="free-h">Free, because of publik</h2>
            <PublikPitch appName="detent" className="lp-pitch" />
            <Pending />
          </div>
          <Film />
        </section>
      </main>
      <Footer />
    </div>
  );
}
