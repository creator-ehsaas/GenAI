import { NextResponse } from "next/server";
import { MODEL } from "@/lib/ai";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    ok: true,
    model: MODEL,
    aiConfigured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
    apiKeyRequired: Boolean(process.env.REELFORGE_API_KEY),
  });
}
