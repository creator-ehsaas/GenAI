import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export class AIError extends Error {
  constructor(
    public code: "refusal" | "truncated" | "empty" | "config",
    message: string,
  ) {
    super(message);
  }
}

/**
 * One structured-output call. Short creative tasks run at low effort; the
 * server-side fallback keeps a request going if the main model declines it.
 */
export async function generate<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<T>> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new AIError("config", "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart.");
  }
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (res.stop_reason === "refusal") throw new AIError("refusal", "The model declined this request. Try rewording it.");
  if (res.stop_reason === "max_tokens") throw new AIError("truncated", "The answer was cut off. Ask for fewer items.");
  if (res.parsed_output == null) throw new AIError("empty", "The model returned no usable answer. Try again.");
  return res.parsed_output as z.infer<T>;
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
  if (e instanceof AIError) {
    const status = e.code === "config" ? 500 : e.code === "refusal" ? 422 : 502;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  if (e instanceof Anthropic.AuthenticationError) {
    return NextResponse.json({ error: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY." }, { status: 500 });
  }
  if (e instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "Rate limited by the model API. Wait a minute and try again." }, { status: 429 });
  }
  if (e instanceof Anthropic.BadRequestError) {
    return NextResponse.json({ error: `The model API rejected the request: ${e.message}` }, { status: 400 });
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return NextResponse.json({ error: "Couldn't reach the model API. Check the server's network." }, { status: 503 });
  }
  if (e instanceof Anthropic.APIError) {
    return NextResponse.json({ error: `Model API error (${e.status ?? "unknown"}). Try again.` }, { status: 502 });
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
