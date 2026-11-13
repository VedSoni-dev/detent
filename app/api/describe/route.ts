import { cookies } from "next/headers";
import { MODELS, publikChat, resolveProvider } from "@/lib/publik";
import { normalize } from "@/lib/detent.js";

/*
 * "Describe it": one sentence about where the slider goes ("spice level for a taco app") → slider settings
 * (label, range, step, where it clicks, unit, colour, cap). publik API when the person chose "Connect your plan"
 * (the key stays in its sealed cookie on the server), otherwise their own Anthropic key from a request header,
 * used for this one call and never stored. Whatever the model says goes through normalize(), so it can't break the slider.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You set up a tactile slider control for an app. The slider clicks (haptic detent) every "detentEvery" units.
Given a short description of what the slider is for, reply with JSON only, no prose:
{"name": string (2-3 words, what it is), "label": string (the short question or name shown above it, max 28 chars),
 "min": number, "max": number, "step": number (the smallest move), "detentEvery": number (where it clicks; between 3 and 20 clicks across the whole range),
 "value": number (a sensible starting value), "suffix": string (a unit like "%", "°", "x", " km", or ""),
 "accent": "#rrggbb" (a colour that fits the app; readable on white and on near-black), "cap": "ridge" | "dot"}`;

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function parse(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[0]);
    if (!raw || typeof raw !== "object") return null;
    return { name: String(raw.name || raw.label || "Slider").slice(0, 40), o: normalize({ ...raw, haptics: true, sound: false }) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ownKey = req.headers.get("x-anthropic-key")?.trim();
  const p = resolveProvider(await cookies(), ownKey ? { baseURL: "https://api.anthropic.com", apiKey: ownKey } : null);
  if (p.kind === "needs_own_key") return json({ error: "Add your Anthropic API key below to use Describe it." }, 401);

  let about = "";
  try {
    const b = (await req.json()) as { about?: unknown };
    about = String(b.about ?? "").trim().slice(0, 300);
  } catch {
    return json({ error: "Bad request." }, 400);
  }
  if (!about) return json({ error: "Say what the slider is for first, like “spice level for a taco app”." }, 400);

  let text = "";
  if (p.kind === "publik") {
    const r = await publikChat(p, { model: MODELS.fast, max_tokens: 400, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: about }] }, req.signal);
    if (!r.ok) return json({ error: r.message, ...(r.topUpUrl ? { topUpUrl: r.topUpUrl } : {}) }, r.status);
    text = r.text;
  } else {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": p.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 400, system: SYSTEM, messages: [{ role: "user", content: about }] }),
      signal: req.signal,
    }).catch(() => null);
    if (!res) return json({ error: "Couldn't reach Anthropic. Try again." }, 502);
    const body = (await res.json().catch(() => ({}))) as { content?: { text?: string }[]; error?: { message?: string } };
    if (!res.ok) return json({ error: body.error?.message ?? `Anthropic answered ${res.status}.` }, res.status === 401 ? 401 : 502);
    text = (body.content ?? []).map((c) => c.text ?? "").join("");
  }
  const s = parse(text);
  return s ? json(s) : json({ error: "The answer wasn't a usable slider. Try a few more words." }, 502);
}
