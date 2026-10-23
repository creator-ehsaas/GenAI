import { brandContext, CREATOR_SYSTEM, generate } from "@/lib/ai";
import { handler } from "@/lib/route";
import { FORMAT_BLURBS, IdeasRequest, IdeasResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(IdeasRequest, async ({ brand, formats, count, focus, avoid, language }) => {
  const prompt = `${brandContext(brand)}

Come up with ${count} distinct short-form video ideas, spread across these formats:
${formats.map((f) => `- ${f}: ${FORMAT_BLURBS[f]}`).join("\n")}
${focus ? `Focus: ${focus}` : ""}
Language: ${language || "English"}

Rules:
- Each hook is at most 14 words, works as on-screen text, and names a pain, desire, or surprising truth. At most one emoji.
- Vary the hook shapes: POV, listicle, confession, myth-busting, "nobody tells you", before/after, challenge, relatable reaction.
- slideshow: 4-7 slides, first slide is the hook, last slide reveals the product naturally. meme: slides = [top text, bottom text]. Others: slides = [].
- hook_demo: demoLabel is a 2-6 word label shown over the product demo part.
- Captions are 1-3 short lines in a casual creator voice that add to the hook rather than repeat it, ending with a soft CTA.
${avoid?.length ? `Do not reuse these hooks: ${JSON.stringify(avoid.slice(0, 60))}` : ""}`;
  return generate({ schema: IdeasResponseSchema, system: CREATOR_SYSTEM, prompt });
});
