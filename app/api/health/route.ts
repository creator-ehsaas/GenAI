import { NextResponse } from "next/server";
import { aiConfigured, MODEL } from "@/lib/ai";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    model: MODEL,
    aiConfigured: aiConfigured(),
    apiKeyRequired: Boolean(process.env.REELFORGE_API_KEY),
  });
}
