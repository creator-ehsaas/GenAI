import "server-only";
import { ApiError, FinishReason, GoogleGenAI, type Part } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
export const aiConfigured = () => Boolean(apiKey());

let client: GoogleGenAI | null = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

/** A problem with what the caller sent; maps to HTTP 400. */
export class InputError extends Error {}

export class AIError extends Error {
  constructor(
    public code: "refusal" | "truncated" | "empty" | "config",
    message: string,
  ) {
    super(message);
  }
}

const BLOCKED = new Set<string>([FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.BLOCKLIST, FinishReason.SPII, FinishReason.RECITATION]);

function requireKey() {
  if (!aiConfigured()) throw new AIError("config", "GEMINI_API_KEY is not set on the server. Add it to .env.local and restart.");
}

/** Gemini's responseJsonSchema takes plain JSON Schema; drop the draft marker zod adds. */
function jsonSchema(schema: z.ZodType) {
  const { $schema: _drop, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

export type InlineImage = { mediaType: string; data: string };

/** One structured-output call, validated against the zod schema. */
export async function generate<T extends z.ZodType>(opts: { schema: T; system: string; prompt: string; images?: InlineImage[] }): Promise<z.infer<T>> {
  requireKey();
  const parts: Part[] = [...(opts.images ?? []).map((i) => ({ inlineData: { mimeType: i.mediaType, data: i.data } })), { text: opts.prompt }];
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema(opts.schema),
      maxOutputTokens: 16000,
    },
  });
  if (res.promptFeedback?.blockReason) throw new AIError("refusal", "Gemini blocked this request. Try rewording it.");
  const finish = res.candidates?.[0]?.finishReason;
  if (finish && BLOCKED.has(finish)) throw new AIError("refusal", "Gemini declined to answer this. Try rewording it.");
  if (finish === FinishReason.MAX_TOKENS) throw new AIError("truncated", "The answer was cut off. Ask for fewer items.");
  const text = res.text;
  if (!text) throw new AIError("empty", "The model returned no usable answer. Try again.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AIError("empty", "The model returned malformed JSON. Try again.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) throw new AIError("empty", "The model's answer didn't match the expected shape. Try again.");
  return parsed.data;
}

/** Free-form research grounded in Google Search. Returns the notes followed by the source URLs. */
export async function webResearch(opts: { system: string; prompt: string }): Promise<string> {
  requireKey();
  const res = await getClient().models.generateContent({
    model: MODEL,
    contents: opts.prompt,
    config: { systemInstruction: opts.system, tools: [{ googleSearch: {} }], maxOutputTokens: 16000 },
  });
  if (res.promptFeedback?.blockReason) throw new AIError("refusal", "Gemini blocked this request.");
  const text = res.text?.trim();
  if (!text) throw new AIError("empty", "The research came back empty. Try again.");
  const sources = new Set(
    (res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).map((c) => c.web?.uri).filter((u): u is string => Boolean(u)),
  );
  return sources.size ? `${text}\n\nSources:\n${[...sources].map((u) => `- ${u}`).join("\n")}` : text;
}

/** Optional bearer-key gate for the public API. */
export function checkAccess(req: Request): NextResponse | null {
  const key = process.env.REELFORGE_API_KEY;
  if (!key) return null;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (got === key) return null;
  return NextResponse.json({ error: "Missing or wrong API key. Send 'Authorization: Bearer <key>'." }, { status: 401 });
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof AIError) {
    const status = e.code === "config" ? 500 : e.code === "refusal" ? 422 : 502;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  if (e instanceof ApiError) {
    if (e.status === 401 || e.status === 403 || (e.status === 400 && /api key/i.test(e.message)))
      return NextResponse.json({ error: "The Gemini API key was rejected. Check GEMINI_API_KEY." }, { status: 500 });
    if (e.status === 404) return NextResponse.json({ error: `Gemini model "${MODEL}" wasn't found. Set GEMINI_MODEL to a model your key can use.` }, { status: 500 });
    if (e.status === 429) return NextResponse.json({ error: "Gemini rate limit or quota reached. Wait a minute and try again." }, { status: 429 });
    if (e.status === 400) return NextResponse.json({ error: `Gemini rejected the request: ${e.message}` }, { status: 400 });
    return NextResponse.json({ error: `Gemini API error (${e.status}). Try again.` }, { status: 502 });
  }
  if (e instanceof TypeError && /fetch failed/i.test(e.message)) {
    return NextResponse.json({ error: "Couldn't reach the Gemini API. Check the server's network." }, { status: 503 });
  }
  console.error(e);
  return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
}

export function brandContext(brand: Record<string, unknown> | null | undefined): string {
  if (!brand || !Object.keys(brand).length) return "Brand: (not provided; keep the content generic but useful)";
  return `Brand profile (JSON): ${JSON.stringify(brand)}`;
}

export const CREATOR_SYSTEM = `You are a short-form content strategist who writes organic TikTok, Instagram Reels and YouTube Shorts for products.
You write like a real creator, not an ad: specific, relatable, curiosity-driven, never salesy. Hooks name a pain or desire in the viewer's own words.
Never claim the person on screen uses or endorses the product (the clips may be stock). Avoid generic tags like #fyp, #viral, #foryou.
Match the requested language exactly (English, Hindi, Hinglish, Spanish, ...). Default to English.`;
