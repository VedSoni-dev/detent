/*! detent · a slider you can feel · MIT · https://github.com/VedSoni-dev/detent */
(function () {
"use strict";
// detent: a slider you can feel. One file, no dependencies, no network, MIT.
// It clicks at every whole number: a vibration on Android, a tap tick on iPhone where Safari allows it,
// an optional sound, and a visual pop everywhere. The cap lifts when you grab it and stretches past the ends.
//
//   const s = mount(element, { label: "How was it?", min: 0, max: 10, step: 0.1, value: 7 });
//   s.set({ accent: "#e8590c" }); s.value; s.destroy();
//
// The same file is served as /detent.js (a plain script: window.Detent, and every [data-detent] element
// on the page becomes a slider).

const DEFAULTS = {
  label: "How was it?",
  min: 0,
  max: 10,
  step: 0.1,
  detentEvery: 1,
  value: 7,
  suffix: "",
  accent: "#e8590c",
  cap: "ridge", // "ridge" | "dot"
  haptics: true,
  sound: false,
};

const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : d);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Cleans any settings object so the slider never throws: bad numbers fall back, min < max, step > 0. */
function normalize(o) {
  const src = o && typeof o === "object" ? o : {};
  let min = num(src.min, DEFAULTS.min);
  let max = num(src.max, DEFAULTS.max);
  if (!(max > min)) { min = DEFAULTS.min; max = DEFAULTS.max; }
  const span = max - min;
  let step = num(src.step, span <= 20 ? 0.1 : 1);
  if (!(step > 0) || step > span) step = span <= 20 ? 0.1 : 1;
  let detentEvery = num(src.detentEvery, 1);
  if (!(detentEvery > 0) || detentEvery > span) detentEvery = span;
  if (span / detentEvery > 200) detentEvery = span / 10;
  const value = clamp(num(src.value, min + span * 0.7), min, max);
  return {
    label: typeof src.label === "string" ? src.label.slice(0, 60) : DEFAULTS.label,
    min, max, step, detentEvery, value,
    suffix: typeof src.suffix === "string" ? src.suffix.slice(0, 6) : "",
    accent: typeof src.accent === "string" && HEX.test(src.accent.trim()) ? src.accent.trim() : DEFAULTS.accent,
    cap: src.cap === "dot" ? "dot" : "ridge",
    haptics: src.haptics !== false && src.haptics !== "false",
    sound: src.sound === true || src.sound === "true",
  };
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function decimalsOf(step) { const s = String(step); const i = s.indexOf("."); return i < 0 ? 0 : Math.min(4, s.length - i - 1); }
/** Snap to the step grid (measured from min), without float dust. */
function snap(v, o) {
  const d = decimalsOf(o.step);
  const k = Math.round((v - o.min) / o.step);
  return clamp(+(o.min + k * o.step).toFixed(d), o.min, o.max);
}
function format(v, o) { return v.toFixed(decimalsOf(o.step)) + (o.suffix || ""); }

/**
 * How many detents a move from a to b crosses or lands on (b's side counts, a's doesn't),
 * so dragging 6.9 → 7.0 clicks once, 7.0 → 6.9 clicks once, and wiggling at 7.0 never double-clicks.
 */
function crossings(a, b, o) {
  if (a === b) return 0;
  const e = 1e-7, ia = (a - o.min) / o.detentEvery, ib = (b - o.min) / o.detentEvery;
  return b > a ? Math.max(0, Math.floor(ib + e) - Math.floor(ia + e)) : Math.max(0, Math.ceil(ia - e) - Math.ceil(ib - e));
}

/** Rubber band: how far the cap travels when the pointer is `d` px past an end (never more than `limit`). */
function rubber(d, limit = 34) {
  const s = d < 0 ? -1 : 1;
  return s * limit * (1 - Math.exp((-Math.abs(d) * 0.35) / limit));
}

/** What this device can do. Feature detection only; nothing is stored or sent. */
function capabilities() {
  if (typeof window === "undefined") return { vibrate: false, ios: false, touch: false };
  const nav = window.navigator;
  const ua = nav.userAgent || "";
  const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
  const touch = (nav.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
  return { vibrate: typeof nav.vibrate === "function" && !ios, ios, touch };
}

/** One honest line about what this device will do. */
function describeDevice(o = {}) {
  const c = capabilities();
  const sound = !!o.sound;
  if (o.haptics !== false && c.vibrate && c.touch) return "This phone vibrates at every whole number.";
  if (c.ios) return `On iPhone it may tick when you tap the cap. Safari has no vibration API, so while you drag each number ${sound ? "clicks and " : ""}pops on screen.`;
  if (sound) return "No vibration here: you hear a click and see a pop at every number. Open it on a phone to feel it.";
  return "No vibration here: every number pops on screen. Turn on sound, or open it on a phone to feel it.";
}

/** Which feedback a detent gets on this device: "haptic" | "sound" | "visual". */
function feedbackTier(o) {
  const c = capabilities();
  if (o.haptics && c.vibrate && c.touch) return "haptic";
  return o.sound ? "sound" : "visual";
}

const CSS = `
.dt{--dt-accent:#e8590c;--dt-ink:#1b1a17;--dt-muted:#7a766d;--dt-rail:#e4e1d9;--dt-tick:#b9b4a8;--dt-tick-on:rgba(255,255,255,.75);--dt-cap:#fbfaf7;--dt-cap-edge:#d8d4ca;--dt-ridge:#b3aea2;--dt-focus:#1b1a17;
  position:relative;width:100%;font:inherit;color:var(--dt-ink);-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
@media (prefers-color-scheme:dark){.dt:not([data-theme=light]){--dt-ink:#f1efe9;--dt-muted:#9b978d;--dt-rail:#2b2a27;--dt-tick:#56534c;--dt-cap:#3a3935;--dt-cap-edge:#55534d;--dt-ridge:#7d7a72;--dt-focus:#f1efe9}}
.dt[data-theme=dark]{--dt-ink:#f1efe9;--dt-muted:#9b978d;--dt-rail:#2b2a27;--dt-tick:#56534c;--dt-cap:#3a3935;--dt-cap-edge:#55534d;--dt-ridge:#7d7a72;--dt-focus:#f1efe9}
.dt-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px;font-size:17px;line-height:1.2}
.dt-label{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dt-value{font-variant-numeric:tabular-nums;color:var(--dt-ink);display:inline-block;transition:transform .12s}
.dt-value.dt-bump{transform:translateY(-2px)}
.dt-track{position:relative;height:44px;touch-action:none;cursor:pointer;outline:none}
.dt-rail{position:absolute;left:0;right:0;top:50%;height:6px;margin-top:-3px;border-radius:99px;background:var(--dt-rail);overflow:hidden}
.dt-fill{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--dt-accent);border-radius:99px}
.dt-ticks{position:absolute;inset:0;pointer-events:none}
.dt-ticks i{position:absolute;top:50%;width:3px;height:3px;margin:-1.5px 0 0 -1.5px;border-radius:50%;background:var(--dt-tick);transition:transform .16s,background .16s}
.dt-ticks i.on{background:var(--dt-tick-on)}
.dt-ticks i.flash{transform:scale(2.2)}
.dt-cap{position:absolute;top:50%;left:0;width:24px;height:38px;margin:-19px 0 0 -12px;border-radius:9px;background:linear-gradient(180deg,var(--dt-cap),color-mix(in srgb,var(--dt-cap) 88%,#000));
  border:1px solid var(--dt-cap-edge);box-shadow:0 1px 2px rgba(0,0,0,.18),0 2px 6px rgba(0,0,0,.08);display:block;cursor:grab;outline:none;
  translate:var(--dt-x,0px) 0;transform:translateY(var(--dt-y,0px));scale:var(--dt-s,1);transition:box-shadow .18s,scale .18s cubic-bezier(.3,1.5,.5,1),transform .08s;will-change:translate,transform}
.dt-cap::before{content:"";position:absolute;left:6px;right:6px;top:12px;height:12px;background:repeating-linear-gradient(180deg,var(--dt-ridge) 0 1.5px,transparent 1.5px 5px);border-radius:1px;opacity:.9}
.dt[data-cap=dot] .dt-cap{width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%}
.dt[data-cap=dot] .dt-cap::before{left:9px;right:9px;top:9px;height:6px;border-radius:50%;background:var(--dt-accent);opacity:1}
.dt[data-settling] .dt-cap{transition:box-shadow .18s,scale .18s,transform .08s,translate .42s cubic-bezier(.25,1.6,.45,1)}
.dt[data-settling] .dt-fill{transition:width .42s cubic-bezier(.25,1.6,.45,1)}
.dt[data-pressed] .dt-cap{--dt-s:1.12;cursor:grabbing;box-shadow:0 6px 14px rgba(0,0,0,.18),0 14px 28px rgba(0,0,0,.14)}
.dt-cap.dt-pop{--dt-y:-2px}
.dt-track:focus-visible .dt-cap,.dt-cap:focus-visible{outline:2px solid var(--dt-focus);outline-offset:3px}
.dt-sw{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none;margin:0;left:0;top:0}
@media (prefers-reduced-motion:reduce){.dt-cap,.dt-value,.dt-ticks i{transition:none}.dt-cap.dt-pop{--dt-y:0px}.dt-ticks i.flash{transform:none}}
`;

let cssDone = false;
function injectCss(doc) {
  if (cssDone || !doc || doc.getElementById("detent-css")) { cssDone = true; return; }
  const s = doc.createElement("style");
  s.id = "detent-css";
  s.textContent = CSS;
  doc.head.appendChild(s);
  cssDone = true;
}

let audio = null;
function click(strength = 1) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = audio || new AC();
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime;
    const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.012), audio.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 6);
    const src = audio.createBufferSource();
    src.buffer = buf;
    const bp = audio.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 1.4;
    const g = audio.createGain();
    g.gain.setValueAtTime(0.5 * strength, t);
    src.connect(bp).connect(g).connect(audio.destination);
    src.start(t);
  } catch { /* no sound on this device */ }
}

let uid = 0;

/** Mounts a slider into `host`. Returns { value, set(opts), focus(), destroy() }. */
function mount(host, options = {}) {
  const doc = host.ownerDocument;
  injectCss(doc);
  let o = normalize(options);
  let cb = { onChange: options.onChange, onDetent: options.onDetent, onCommit: options.onCommit };
  let value = snap(o.value, o);
  const id = `dt${++uid}`;
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  host.innerHTML = "";
  const root = el("div", "dt");
  const head = el("div", "dt-head");
  const label = el("span", "dt-label"); label.id = id + "l";
  const out = el("output", "dt-value");
  head.append(label, out);
  const track = el("div", "dt-track");
  const rail = el("div", "dt-rail");
  const fill = el("div", "dt-fill");
  const ticks = el("div", "dt-ticks");
  rail.append(fill);
  // The cap is a <label> for a hidden iOS switch: a real tap on it toggles the switch, which is what makes
  // Safari (iOS 17.4+) fire the Taptic Engine. Everywhere else the switch is inert.
  const cap = el("label", "dt-cap");
  cap.setAttribute("role", "slider");
  cap.tabIndex = 0;
  cap.setAttribute("aria-labelledby", label.id);
  const sw = el("input", "dt-sw");
  sw.type = "checkbox"; sw.setAttribute("switch", ""); sw.tabIndex = -1; sw.setAttribute("aria-hidden", "true");
  cap.append(sw);
  // A second switch for programmatic ticks (older iOS honoured label.click(); 26.5+ ignores it, harmlessly).
  const auxSw = el("input", "dt-sw"); auxSw.type = "checkbox"; auxSw.setAttribute("switch", ""); auxSw.id = id + "s"; auxSw.tabIndex = -1; auxSw.setAttribute("aria-hidden", "true");
  const aux = el("label", "dt-sw"); aux.htmlFor = auxSw.id; aux.setAttribute("aria-hidden", "true");
  track.append(rail, ticks, cap, auxSw, aux);
  root.append(head, track);
  host.append(root);

  let width = 0, overshoot = 0, pressed = false, pid = null, lastPulse = 0, spring = 0, popT = 0, flashT = 0, prevValue = value;

  function paintStatic() {
    root.style.setProperty("--dt-accent", o.accent);
    root.dataset.cap = o.cap;
    label.textContent = o.label;
    cap.setAttribute("aria-valuemin", String(o.min));
    cap.setAttribute("aria-valuemax", String(o.max));
    // interior detent marks (none when there would be too many to read)
    ticks.innerHTML = "";
    const n = Math.round((o.max - o.min) / o.detentEvery);
    if (n >= 2 && n <= 40) for (let k = 1; k < n; k++) { const i = doc.createElement("i"); i.style.left = (k / n) * 100 + "%"; i.dataset.k = String(k); ticks.append(i); }
  }
  function paint() {
    const f = (value - o.min) / (o.max - o.min);
    width = track.clientWidth || width;
    const x = f * width + overshoot;
    cap.style.setProperty("--dt-x", x + "px");
    fill.style.width = clamp(x, 0, width) + "px";
    const txt = format(value, o);
    out.textContent = txt;
    cap.setAttribute("aria-valuenow", String(value));
    cap.setAttribute("aria-valuetext", (o.label ? o.label + " " : "") + txt);
    for (const i of ticks.children) i.classList.toggle("on", +i.dataset.k / (ticks.children.length + 1) < f - 1e-9);
    root.dataset.feedback = feedbackTier(o);
  }

  function pulse(n) {
    const now = performance.now();
    if (now - lastPulse < 25) return; // several crossings in one frame or a fast fling: one pulse
    lastPulse = now;
    if (o.haptics) {
      const c = capabilities();
      if (c.vibrate) { try { navigator.vibrate(n > 1 ? 12 : 8); } catch { /* blocked */ } }
      else if (c.ios) { try { aux.click(); } catch { /* ignored */ } }
    }
    if (o.sound) click(n > 1 ? 1.2 : 1);
    // the visual detent, which always runs
    cap.classList.add("dt-pop"); out.classList.add("dt-bump");
    clearTimeout(popT); popT = setTimeout(() => { cap.classList.remove("dt-pop"); out.classList.remove("dt-bump"); }, 90);
    const k = Math.round((value - o.min) / o.detentEvery);
    const t = ticks.querySelector(`i[data-k="${k}"]`);
    if (t) { t.classList.add("flash"); clearTimeout(flashT); flashT = setTimeout(() => t.classList.remove("flash"), 140); }
  }

  function setValue(v, fromUser) {
    const nv = snap(v, o);
    if (nv === value) return;
    const n = crossings(value, nv, o);
    value = nv;
    paint();
    if (n > 0 && fromUser) { pulse(n); cb.onDetent?.(value); }
    cb.onChange?.(value);
  }

  function fromPointer(e) {
    const r = rail.getBoundingClientRect();
    width = r.width;
    const px = e.clientX - r.left;
    const raw = o.min + (px / r.width) * (o.max - o.min);
    if (px < 0) overshoot = reduce ? 0 : rubber(px);
    else if (px > r.width) overshoot = reduce ? 0 : rubber(px - r.width);
    else overshoot = 0;
    setValue(raw, true);
    paint();
  }

  function settle() {
    if (!pressed && pid === null) return;
    pressed = false; pid = null;
    delete root.dataset.pressed;
    if (o.haptics && capabilities().ios) { /* the release tick comes from the switch on tap; nothing to force here */ }
    springBack();
    if (prevValue !== value) cb.onCommit?.(value);
  }
  // Spring back with a CSS transition (springy curve) instead of a JS loop: it always ends, even in a background tab.
  function springBack() {
    if (overshoot === 0) { paint(); return; }
    overshoot = 0;
    if (!reduce) { root.dataset.settling = ""; clearTimeout(spring); spring = setTimeout(() => { delete root.dataset.settling; }, 420); }
    paint();
  }

  const onDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    if (pid !== null) return;
    pid = e.pointerId; pressed = true; prevValue = value;
    clearTimeout(spring); delete root.dataset.settling;
    try { track.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
    root.dataset.pressed = "";
    if (o.sound) click(0.6); // unlocks Web Audio on this gesture and gives the grab its own click
    if (o.haptics && capabilities().vibrate) { try { navigator.vibrate(6); } catch { /* blocked */ } }
    fromPointer(e);
    if (e.target !== cap && e.target !== sw) e.preventDefault();
    cap.focus({ preventScroll: true });
  };
  const onMove = (e) => { if (e.pointerId === pid) fromPointer(e); };
  const onUp = (e) => { if (e.pointerId === pid) settle(); };
  const onKey = (e) => {
    const big = o.detentEvery;
    const map = { ArrowRight: o.step, ArrowUp: o.step, ArrowLeft: -o.step, ArrowDown: -o.step, PageUp: big, PageDown: -big };
    let next = null;
    if (e.key in map) next = value + (e.shiftKey ? Math.sign(map[e.key]) * big : map[e.key]);
    else if (e.key === "Home") next = o.min;
    else if (e.key === "End") next = o.max;
    if (next === null) return;
    e.preventDefault();
    setValue(next, true);
    cb.onCommit?.(value);
  };
  const onBlur = () => settle();
  const onResize = () => paint();
  // the switch toggling is the iOS tick; never let it move focus or bubble a click into anything else
  const onSwClick = (e) => e.stopPropagation();

  track.addEventListener("pointerdown", onDown);
  track.addEventListener("pointermove", onMove);
  track.addEventListener("pointerup", onUp);
  track.addEventListener("pointercancel", onUp);
  track.addEventListener("lostpointercapture", onUp);
  cap.addEventListener("keydown", onKey);
  sw.addEventListener("click", onSwClick);
  window.addEventListener("blur", onBlur);
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
  ro ? ro.observe(track) : window.addEventListener("resize", onResize);

  paintStatic();
  paint();

  return {
    get value() { return value; },
    get options() { return { ...o, value }; },
    set(next = {}) {
      if ("onChange" in next) cb.onChange = next.onChange;
      if ("onDetent" in next) cb.onDetent = next.onDetent;
      if ("onCommit" in next) cb.onCommit = next.onCommit;
      const keepValue = !("value" in next);
      o = normalize({ ...o, ...next, value: keepValue ? value : next.value });
      value = snap(o.value, o);
      paintStatic(); paint();
    },
    focus() { cap.focus(); },
    destroy() {
      clearTimeout(spring); clearTimeout(popT); clearTimeout(flashT);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
      track.removeEventListener("lostpointercapture", onUp);
      cap.removeEventListener("keydown", onKey);
      sw.removeEventListener("click", onSwClick);
      window.removeEventListener("blur", onBlur);
      ro ? ro.disconnect() : window.removeEventListener("resize", onResize);
      host.innerHTML = "";
    },
  };

  function el(tag, cls) { const n = doc.createElement(tag); if (cls) n.className = cls; return n; }
}

/** Reads data-* attributes (data-label, data-min, data-max, data-step, data-detent-every, data-value, data-suffix, data-accent, data-cap, data-haptics, data-sound). */
function optionsFromDataset(ds) {
  return { label: ds.label, min: ds.min, max: ds.max, step: ds.step, detentEvery: ds.detentEvery, value: ds.value, suffix: ds.suffix, accent: ds.accent, cap: ds.cap, haptics: ds.haptics, sound: ds.sound };
}

var api = { mount: mount, normalize: normalize, describeDevice: describeDevice, capabilities: capabilities, DEFAULTS: DEFAULTS };
globalThis.Detent = api;
function boot() {
  document.querySelectorAll("[data-detent]").forEach(function (n) {
    if (n.__detent) return;
    var opts = optionsFromDataset(n.dataset);
    opts.onChange = function (v) { n.dataset.value = String(v); n.dispatchEvent(new CustomEvent("detent:change", { detail: { value: v }, bubbles: true })); };
    n.__detent = mount(n, opts);
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
}
if (typeof module === "object" && module && module.exports) module.exports = api;
})();
