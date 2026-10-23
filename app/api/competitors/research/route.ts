import { generate, webResearch } from "@/lib/ai";
import { ANALYST_SYSTEM } from "@/lib/competitorPrompts";
import { handler } from "@/lib/route";
import { CompetitorResearchSchema, ResearchRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = handler(ResearchRequest, async ({ competitor }) => {
  const notes = await webResearch({
    system: ANALYST_SYSTEM,
    prompt: `Research how ${competitor.name}${competitor.url ? ` (${competitor.url})` : ""} markets itself with short-form video and paid social.
Look for: their positioning and audience; the platforms and creators they use; specific ads, campaigns or viral organic videos (TikTok, Instagram Reels, YouTube Shorts, Meta ads), with the hook or opening line where it is quoted; offers and calls to action; anything reported about which ads ran longest or performed best.
Report only what sources say, with the URL for each item. Say plainly when little is public.`,
  });
  const structured = await generate({
    schema: CompetitorResearchSchema,
    system: ANALYST_SYSTEM,
    prompt: `Turn these research notes about ${competitor.name} into a structured record. Only include ads the notes actually describe, each with its source URL. Do not add anything that is not in the notes.\n\nNotes:\n"""\n${notes}\n"""`,
  });
  return { ...structured, raw: notes };
});
