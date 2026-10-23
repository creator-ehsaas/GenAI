import type Anthropic from "@anthropic-ai/sdk";
import { generate, InputError } from "@/lib/ai";
import { ANALYST_SYSTEM } from "@/lib/competitorPrompts";
import { handler } from "@/lib/route";
import { ExtractAdsRequest, ExtractAdsResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(ExtractAdsRequest, async ({ competitor, text, images }) => {
  if (!text?.trim() && !images?.length) throw new InputError("Paste ad copy or add at least one screenshot.");
  const instructions = `Extract every distinct ad from ${competitor.name}${competitor.url ? ` (${competitor.url})` : ""} in the material below into structured records.
- One record per ad. If the same ad appears twice, keep one.
- Quote the hook verbatim. If a screenshot shows on-screen text, that text is usually the hook.
- daysRunning: only when the material states a start date or run time (Ad Library screenshots often say "Started running on <date>"; today is ${new Date().toISOString().slice(0, 10)}). Otherwise null.
- Leave fields empty rather than guessing.`;
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...(images ?? []).map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } })),
    { type: "text", text: `${instructions}${text?.trim() ? `\n\nPasted material:\n"""\n${text.trim()}\n"""` : ""}` },
  ];
  return generate({ schema: ExtractAdsResponseSchema, system: ANALYST_SYSTEM, prompt: content });
});
