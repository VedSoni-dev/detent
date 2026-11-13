"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Detent from "@/components/Detent";
import { PublikChoice, usePublik } from "@/components/PublikGate";
import { describeDevice, normalize, type DetentOptions } from "@/lib/detent.js";
import { htmlSnippet, reactSnippet } from "@/lib/exportCode";
import { PRESETS, decode, empty, encode, load, newId, save, type Saved, type Store } from "@/lib/store";
import Mark from "@/components/Mark";

const SWATCHES = ["#e8590c", "#1f8a5b", "#2f6fdf", "#c2255c", "#0e7490", "#1b1a17"];

export default function Playground() {
  const [store, setStore] = useState<Store | null>(null);
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    let s = load();
    // opened from a link or the QR code: add that slider to this browser's list and show it
    const c = new URLSearchParams(location.search).get("c");
    if (c) {
      const d = decode(c);
      if (d) {
        const dupe = s.sliders.find((x) => x.name === d.name && JSON.stringify(x.o) === JSON.stringify(d.o));
        if (dupe) s = { ...s, current: dupe.id };
        else { const id = newId(); s = { ...s, sliders: [{ id, name: d.name, o: d.o, updated: Date.now() }, ...s.sliders], current: id }; }
        setShared(d.name);
        save(s); // saved now, so the slider is still there if this effect runs again (React dev remount) or the tab reloads
      }
      history.replaceState(null, "", location.pathname);
    }
    setStore(s);
  }, []);

  const update = useCallback((fn: (s: Store) => Store) => setStore((prev) => { const n = fn(prev ?? empty()); save(n); return n; }), []);

  if (!store) return <div className="ws-loading" aria-busy="true"><span>Loading your sliders</span></div>;
  const current = store.sliders.find((s) => s.id === store.current) ?? null;
  if (!current) return <Onboarding onCreate={(name, o) => update((s) => { const id = newId(); return { ...s, sliders: [{ id, name, o, updated: Date.now() }, ...s.sliders], current: id }; })} />;
  return <Workbench key={current.id} store={store} doc={current} update={update} shared={shared} clearShared={() => setShared(null)} />;
}

/* ---------- first run: make your own first slider ---------- */
function Onboarding({ onCreate }: { onCreate: (name: string, o: DetentOptions) => void }) {
  const [preset, setPreset] = useState<keyof typeof PRESETS>("rating");
  const [label, setLabel] = useState("");
  const base = PRESETS[preset];
  const o = normalize({ ...base.o, label: label.trim() || base.o.label });
  const create = () => onCreate(label.trim() || base.name, o);
  return (
    <div className="ws">
      <TopBar />
      <main className="wrap onb">
        <div className="onb-copy">
        <p className="eyebrow">Your first slider</p>
        <h1>Pick what your slider sets</h1>
        <p className="lede">Choose a kind and write the words above it. The slider clicks at every step, and you can change everything after.</p>
        <div className="chips" role="group" aria-label="Kind of slider">
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={preset === k} onClick={() => setPreset(k)}>
              {PRESETS[k].name} <span className="muted mono">{PRESETS[k].o.min}–{PRESETS[k].o.max}{PRESETS[k].o.suffix ?? ""}</span>
            </button>
          ))}
        </div>
        <label className="field">
          <span>The words above it</span>
          <input value={label} maxLength={60} placeholder={String(base.o.label)} onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
        </label>
        <button type="button" className="btn primary big" onClick={create}>Make my slider</button>
        <p className="muted small-print">Saved in this browser only. Nothing is uploaded.</p>
        </div>
        <div className="ground">
          <div className="stage">
            <div className="stage-bar"><span className="dots" aria-hidden="true"><i /><i /><i /></span><span>Preview · {base.name}</span></div>
            <div className="stage-body"><Detent {...o} /></div>
          </div>
          <p className="device">Drag the cap. It clicks at every {o.detentEvery === 1 ? "whole number" : `${o.detentEvery}${o.suffix}`}.</p>
        </div>
      </main>
    </div>
  );
}

/* ---------- the workbench ---------- */
function Workbench({ store, doc, update, shared, clearShared }: { store: Store; doc: Saved; update: (fn: (s: Store) => Store) => void; shared: string | null; clearShared: () => void }) {
  const o = doc.o;
  const [live, setLive] = useState(o.value);
  const [ticks, setTicks] = useState(0);
  const [device, setDevice] = useState("");
  const [tab, setTab] = useState<"react" | "html">("react");
  const [copied, setCopied] = useState("");
  const [origin, setOrigin] = useState("https://detent-beta.vercel.app");
  const previewRef = useRef<HTMLDivElement>(null);
  const tuneRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOrigin(location.origin); }, []);
  useEffect(() => { setDevice(describeDevice(o)); }, [o]);

  const patch = (p: Partial<DetentOptions> & { name?: string }) =>
    update((s) => ({
      ...s,
      sliders: s.sliders.map((x) => (x.id === doc.id ? { ...x, name: p.name ?? x.name, o: normalize({ ...x.o, ...p }), updated: Date.now() } : x)),
    }));

  const shareUrl = useMemo(() => `${origin}/app?c=${encode(doc.name, { ...o, value: live })}`, [origin, doc.name, o, live]);
  const code = tab === "react" ? reactSnippet({ ...o, value: live }) : htmlSnippet({ ...o, value: live }, origin);

  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1600); } catch { setCopied("press ⌘C"); }
  };
  const focusSlider = () => (previewRef.current?.querySelector(".dt-cap") as HTMLElement | null)?.focus();

  return (
    <div className="ws">
      <TopBar>
        <label className="sr-only" htmlFor="pick">Your sliders</label>
        <select id="pick" className="pick" value={doc.id} onChange={(e) => update((s) => ({ ...s, current: e.target.value }))}>
          {store.sliders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="button" className="btn" onClick={() => update((s) => ({ ...s, current: null }))}>New<span className="hide-sm"> slider</span></button>
        <DataMenu store={store} update={update} />
      </TopBar>

      {shared && (
        <p className="note" role="status">Opened “{shared}” from a link and saved it to your sliders. <button type="button" className="link" onClick={clearShared}>OK</button></p>
      )}

      {!store.howtoDone && (
        <section className="howto" aria-label="How to use detent">
          <ol>
            <li><button type="button" className="link" onClick={focusSlider}><b>1. Feel it.</b></button> Drag the cap. On a phone it vibrates at every {o.detentEvery === 1 ? "whole number" : `${o.detentEvery}${o.suffix}`}; on desktop, scan the QR code.</li>
            <li><button type="button" className="link" onClick={() => tuneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><b>2. Make it yours.</b></button> Change the words, range, colour and cap, or describe it in a sentence.</li>
            <li><button type="button" className="link" onClick={() => codeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><b>3. Take it.</b></button> Copy the React or HTML and drop it into your app.</li>
          </ol>
          <button type="button" className="btn" onClick={() => update((s) => ({ ...s, howtoDone: true }))}>Got it</button>
        </section>
      )}

      <main className="bench">
        <section className="preview ground" ref={previewRef} aria-label="Preview">
          <div className="stage">
            <div className="stage-bar"><span className="dots" aria-hidden="true"><i /><i /><i /></span><span>{doc.name}</span></div>
            <div className="stage-body">
              <Detent {...o} onChange={setLive} onDetent={() => setTicks((t) => t + 1)} onCommit={(v) => patch({ value: v })} />
            </div>
          </div>
          <p className="device" data-testid="device">{device}</p>
          <p className="tickcount" aria-live="off">{ticks} {ticks === 1 ? "click" : "clicks"} this session</p>
          <PhoneQr url={shareUrl} onCopy={() => copy("link", shareUrl)} copied={copied === "link"} />
        </section>

        <section className="panel tune" ref={tuneRef} aria-label="Settings">
          <h2>Make it yours</h2>
          <div className="grid2">
            <label className="field"><span>Name (only you see it)</span><input value={doc.name} maxLength={60} onChange={(e) => patch({ name: e.target.value })} /></label>
            <label className="field"><span>Words above it</span><input value={o.label} maxLength={60} onChange={(e) => patch({ label: e.target.value })} /></label>
            <NumField label="From" value={o.min} onCommit={(v) => patch({ min: v })} />
            <NumField label="To" value={o.max} onCommit={(v) => patch({ max: v })} />
            <NumField label="Smallest move" value={o.step} onCommit={(v) => patch({ step: v })} />
            <NumField label="Clicks every" value={o.detentEvery} onCommit={(v) => patch({ detentEvery: v })} />
            <label className="field"><span>Unit after the number</span><input value={o.suffix} maxLength={6} placeholder="%, °, x" onChange={(e) => patch({ suffix: e.target.value })} /></label>
            <div className="field">
              <span>Cap</span>
              <div className="seg" role="group" aria-label="Cap">
                <button type="button" aria-pressed={o.cap === "ridge"} onClick={() => patch({ cap: "ridge" })}>Ridged</button>
                <button type="button" aria-pressed={o.cap === "dot"} onClick={() => patch({ cap: "dot" })}>Dot</button>
              </div>
            </div>
          </div>
          <div className="field">
            <span>Colour</span>
            <div className="swatches">
              {SWATCHES.map((c) => <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={c} aria-pressed={o.accent.toLowerCase() === c} onClick={() => patch({ accent: c })} />)}
              <input type="color" aria-label="Any colour" value={o.accent.length === 7 ? o.accent : "#e8590c"} onChange={(e) => patch({ accent: e.target.value })} />
            </div>
          </div>
          <div className="toggles">
            <label className="toggle"><input type="checkbox" checked={o.haptics} onChange={(e) => patch({ haptics: e.target.checked })} /> Vibrate on phones</label>
            <label className="toggle"><input type="checkbox" checked={o.sound} onChange={(e) => patch({ sound: e.target.checked })} /> Click sound</label>
          </div>
          <Describe onResult={(name, n) => patch({ ...n, name })} />
        </section>

        <section className="panel code" ref={codeRef} aria-label="Code">
          <div className="code-head">
            <h2>Put it in your app</h2>
            <div className="tabs" role="tablist">
              <button role="tab" type="button" aria-selected={tab === "react"} onClick={() => setTab("react")}>React</button>
              <button role="tab" type="button" aria-selected={tab === "html"} onClick={() => setTab("html")}>HTML</button>
            </div>
          </div>
          <p className="muted">
            {tab === "react" ? <>Save <a href="/detent.js" download>detent.js</a> next to your component, then paste this.</> : <>One script tag and one div. Works in any page.</>}
            {" "}One file, no dependencies, MIT.
          </p>
          <pre className="snippet"><code>{code}</code></pre>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => copy(tab, code)}>{copied === tab ? "Copied" : tab === "react" ? "Copy React" : "Copy HTML"}</button>
            <a className="btn" href="/detent.js" download>Download detent.js</a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function NumField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  const commit = () => { const v = parseFloat(txt); if (Number.isFinite(v)) onCommit(v); else setTxt(String(value)); };
  return (
    <label className="field">
      <span>{label}</span>
      <input inputMode="decimal" className="mono" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
    </label>
  );
}

/* the QR is for desktop visitors: one scan opens this exact slider on their phone */
function PhoneQr({ url, onCopy, copied }: { url: string; onCopy: () => void; copied: boolean }) {
  const [svg, setSvg] = useState("");
  const [desk, setDesk] = useState(false);
  useEffect(() => { setDesk(matchMedia("(hover: hover) and (pointer: fine)").matches); }, []);
  useEffect(() => {
    if (!desk) return;
    let off = false;
    import("qrcode-generator").then(({ default: qrcode }) => {
      const q = qrcode(0, "M"); q.addData(url); q.make();
      if (!off) setSvg(q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }));
    }).catch(() => {});
    return () => { off = true; };
  }, [url, desk]);
  return (
    <div className="qr">
      {desk && svg && <div className="qr-img" role="img" aria-label="QR code for this slider" dangerouslySetInnerHTML={{ __html: svg }} />}
      <div>
        {desk && <p><b>Feel it on your phone.</b> Scan with the camera: it opens this exact slider.</p>}
        <button type="button" className="btn" onClick={onCopy}>{copied ? "Link copied" : "Copy link to this slider"}</button>
      </div>
    </div>
  );
}

function Describe({ onResult }: { onResult: (name: string, o: Partial<DetentOptions>) => void }) {
  const { choice } = usePublik();
  const [about, setAbout] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ msg: string; topUp?: string } | null>(null);
  useEffect(() => { try { setKey(sessionStorage.getItem("detent:key") ?? ""); } catch { /* ignore */ } }, []);
  const ownKey = choice !== "publik";
  const IDEAS = ["spice level for a taco app", "tip percentage at checkout", "how tired are you today", "playback speed"];
  const run = async (text = about) => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (ownKey && key.trim()) headers["x-anthropic-key"] = key.trim();
      const res = await fetch("/api/describe", { method: "POST", headers, body: JSON.stringify({ about: text }) });
      const body = (await res.json().catch(() => ({}))) as { name?: string; o?: DetentOptions; error?: string; topUpUrl?: string };
      if (!res.ok || !body.o) { setErr({ msg: body.error ?? "Something went wrong. Try again.", topUp: body.topUpUrl }); return; }
      const { haptics: _h, sound: _s, ...rest } = body.o;
      void _h; void _s;
      onResult(body.name ?? "Slider", rest);
    } catch { setErr({ msg: "Couldn't reach the server. Try again." }); } finally { setBusy(false); }
  };
  return (
    <div className="describe">
      <h3>Or describe it</h3>
      <p className="muted">One sentence about where it goes. AI picks the words, range, clicks and colour.</p>
      <div className="row">
        <input aria-label="What the slider is for" value={about} maxLength={300} placeholder="spice level for a taco app" onChange={(e) => setAbout(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void run(); } }} />
        <button type="button" className="btn primary" disabled={busy || !about.trim()} onClick={() => void run()}>{busy ? "Thinking…" : "Set it up"}</button>
      </div>
      <div className="ideas">{IDEAS.map((i) => <button key={i} type="button" className="idea" disabled={busy} onClick={() => { setAbout(i); void run(i); }}>{i}</button>)}</div>
      {err && <p className="err" role="alert">{err.msg}{err.topUp && <> <a href={err.topUp} target="_blank" rel="noopener noreferrer">Top up on publik</a></>}</p>}
      <PublikChoice />
      {ownKey && (
        <label className="field">
          <span>Your Anthropic API key <em className="muted">(kept in this tab only, sent only with this request)</em></span>
          <input type="password" autoComplete="off" value={key} placeholder="sk-ant-…"
            onChange={(e) => { setKey(e.target.value); try { sessionStorage.setItem("detent:key", e.target.value); } catch { /* ignore */ } }} />
        </label>
      )}
    </div>
  );
}

function DataMenu({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "detent-sliders.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      const list: Saved[] = (Array.isArray(j?.sliders) ? j.sliders : []).map((s: Saved) => ({ id: newId(), name: String(s?.name || "Slider").slice(0, 60), o: normalize(s?.o), updated: Date.now() }));
      if (list.length) update((s) => ({ ...s, sliders: [...list, ...s.sliders], current: list[0].id }));
    } catch { alert("That file isn't a detent export."); }
  };
  const remove = () => {
    const cur = store.sliders.find((s) => s.id === store.current);
    if (!cur || !confirm(`Delete “${cur.name}”?`)) return;
    update((s) => { const sliders = s.sliders.filter((x) => x.id !== cur.id); return { ...s, sliders, current: sliders[0]?.id ?? null }; });
  };
  return (
    <details className="menu">
      <summary className="btn">Manage</summary>
      <div className="menu-list">
        <button type="button" onClick={exportJson}>Export my sliders (JSON)</button>
        <button type="button" onClick={() => file.current?.click()}>Import sliders…</button>
        <button type="button" onClick={remove}>Delete this slider</button>
        <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
      </div>
    </details>
  );
}

function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="top-wrap">
      <header className="top">
        <a href="/" className="brand"><Mark /> detent</a>
        <div className="top-r">{children}</div>
      </header>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <span>After a slider design by <a href="https://x.com/MlXZY88/status/2120973389498098103" target="_blank" rel="noopener noreferrer">Max Yan</a></span>
      <span>free &amp; open source · <a href="https://github.com/VedSoni-dev/detent" target="_blank" rel="noopener noreferrer">GitHub</a></span>
      <span>not affiliated with Max Yan · built by <a href="https://x.com/forkthis_ai" target="_blank" rel="noopener noreferrer">@forkthis_ai</a></span>
    </footer>
  );
}
