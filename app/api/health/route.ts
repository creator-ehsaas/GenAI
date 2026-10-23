import { NextResponse } from "next/server";
import { aiConfigured, FALLBACK_MODEL, MODEL } from "@/lib/ai";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    model: MODEL,
    fallbackModel: FALLBACK_MODEL || null,
    aiConfigured: aiConfigured(),
    apiKeyRequired: Boolean(process.env.REELFORGE_API_KEY),
  });
}
