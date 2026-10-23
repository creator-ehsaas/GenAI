import { brandContext, generate, InputError } from "@/lib/ai";
import { ANALYST_SYSTEM } from "@/lib/competitorPrompts";
import { handler } from "@/lib/route";
import { PatternReportSchema, PatternsRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = handler(PatternsRequest, async ({ brand, competitors }) => {
  const total = competitors.reduce((n, c) => n + c.ads.length, 0);
  if (total < 3) throw new InputError("Add at least 3 competitor ads before analyzing patterns.");
  const prompt = `Our brand — ${brandContext(brand)}

Here are ${total} ads from ${competitors.length} competitor${competitors.length > 1 ? "s" : ""} (JSON):
${JSON.stringify(competitors)}

Find the patterns:
1. Hook patterns: group hooks by shape (not topic), give each a reusable template, count how many ads use it, and list which competitors.
2. Angles: the pains, desires and beliefs the ads play on, and how crowded each is.
3. Formats, CTAs and offers, most common first.
4. Long runners: ads with the longest known daysRunning. Paid ads that keep running are usually profitable, so say what they share. Leave empty if no run times are known.
5. Gaps: angles, audiences, formats or tones nobody is using well that fit our brand.
6. A playbook of 5-8 plays for our brand that borrow the structures that work and exploit the gaps. Each play's exampleHook is written for our product in our tone.
Base counts only on the ads given. If the sample is small, say so in the summary.`;
  return generate({ schema: PatternReportSchema, system: ANALYST_SYSTEM, prompt });
});
