import type { DetentOptions } from "@/lib/detent.js";
import { DEFAULTS } from "@/lib/detent.js";

// The code people copy into their own app. Same engine as this site: public/detent.js (one file, MIT).
const attr = (k: string) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function changed(o: DetentOptions): [keyof DetentOptions, unknown][] {
  const keys: (keyof DetentOptions)[] = ["label", "min", "max", "step", "detentEvery", "value", "suffix", "accent", "cap", "haptics", "sound"];
  return keys.filter((k) => k === "label" || k === "min" || k === "max" || o[k] !== DEFAULTS[k]).map((k) => [k, o[k]]);
}

export function htmlSnippet(o: DetentOptions, origin: string) {
  const attrs = changed(o).map(([k, v]) => `  data-${attr(k)}="${esc(String(v))}"`).join("\n");
  return `<!-- 1. once per page (or save detent.js next to your page and point src at it) -->
<script src="${origin}/detent.js" defer></script>

<!-- 2. the slider, anywhere -->
<div data-detent
${attrs}
></div>

<script>
  // optional: read the value
  document.addEventListener("detent:change", (e) => console.log(e.detail.value));
</script>`;
}

export function reactSnippet(o: DetentOptions) {
  const props = changed(o)
    .map(([k, v]) => (typeof v === "string" ? `      ${k}=${JSON.stringify(v)}` : `      ${k}={${JSON.stringify(v)}}`))
    .join("\n");
  return `// Save detent.js (download below) next to this file. No npm package, no dependencies.
"use client";
import { useEffect, useRef } from "react";
import "./detent.js"; // defines globalThis.Detent

type Opts = Record<string, unknown> & { onChange?: (v: number) => void };

export function Detent(props: Opts) {
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<any>(null);
  useEffect(() => {
    inst.current = (globalThis as any).Detent.mount(host.current, props);
    return () => inst.current?.destroy();
  }, []);
  // later prop changes (but not the starting value, so a drag is never reset)
  useEffect(() => { const { value, ...rest } = props; inst.current?.set(rest); });
  return <div ref={host} />;
}

export default function Example() {
  return (
    <Detent
${props}
      onChange={(v) => console.log(v)}
    />
  );
}`;
}
