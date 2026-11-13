// Builds public/detent.js from lib/detent.js: the same engine as a plain script tag.
// It defines window.Detent and turns every [data-detent] element on the page into a slider.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const src = readFileSync("lib/detent.js", "utf8").replace(/^export (const|function|let) /gm, "$1 ");
const out = `/*! detent · a slider you can feel · MIT · https://github.com/VedSoni-dev/detent */
(function () {
"use strict";
${src}
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
`;
mkdirSync("public", { recursive: true });
writeFileSync("public/detent.js", out);
console.log("public/detent.js", (out.length / 1024).toFixed(1) + " KB");
