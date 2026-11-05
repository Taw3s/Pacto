// Minimal Gemini REST client (server only). The key never reaches the browser.
import "server-only";
import { RESPONSE_SCHEMA } from "./ai-review";

const DEFAULT_MODEL = "gemini-flash-latest";
// Lighter model used when the main one is overloaded (503), rate-limited, slow or unavailable.
const DEFAULT_FALLBACK_MODEL = "gemini-flash-lite-latest";
const DEFAULT_API = "https://generativelanguage.googleapis.com/v1beta";
const ATTEMPT_TIMEOUT_MS = 20_000; // two attempts fit in the route's 60 s budget

export function geminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

function models(): string[] {
  const main = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  return fallback === main ? [main] : [main, fallback];
}

class GeminiError extends Error {
  constructor(
    message: string,
    /** Worth trying the fallback model (overload, rate limit, timeout, unknown model). */
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function call(model: string, prompt: string, imagesBase64: string[]): Promise<string> {
  const base = process.env.GEMINI_API_URL || DEFAULT_API; // overridable for local tests
  let res: Response;
  try {
    res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...imagesBase64.map((data) => ({ inline_data: { mime_type: "image/jpeg", data } }))] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0 },
      }),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  } catch (e) {
    throw new GeminiError(`${model}: ${e instanceof Error ? e.message : "network error"}`, true);
  }
  if (!res.ok) {
    // 400/401/403 are configuration problems (bad key, API disabled): another model won't help.
    const retryable = ![400, 401, 403].includes(res.status);
    throw new GeminiError(`${model}: HTTP ${res.status}`, retryable);
  }
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GeminiError(`${model}: no text in answer`, true);
  return text;
}

/** Sends the proof's photos + prompt; falls back to a lighter model when the main one is overloaded or slow. */
export async function askGemini(prompt: string, jpegs: ArrayBuffer[]): Promise<{ text: string; model: string }> {
  const images = jpegs.map((j) => Buffer.from(j).toString("base64"));
  const errors: string[] = [];
  for (const model of models()) {
    try {
      return { text: await call(model, prompt, images), model };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      if (e instanceof GeminiError && !e.retryable) break;
    }
  }
  throw new Error(`Gemini failed: ${errors.join(" | ")}`);
}
