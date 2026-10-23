import { brandContext, CREATOR_SYSTEM, generate } from "@/lib/ai";
import { handler } from "@/lib/route";
import { HooksRequest, HooksResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(HooksRequest, async ({ brand, count, template, avoid, language }) => {
  const prompt = `${brandContext(brand)}

Write ${count} on-screen hooks for short selfie-style videos that promote this product organically.
${template ? `Follow this proven template, filling it in for the product: "${template}"` : "Vary the formats: POV, listicle, confession, myth-busting, relatable reaction."}
Language: ${language || "English"}
Rules: max 14 words each; relatable and curiosity-driven; name the pain or desire rather than hard-selling; at most one emoji each.
${avoid?.length ? `Avoid these existing hooks: ${JSON.stringify(avoid.slice(0, 60))}` : ""}`;
  return generate({ schema: HooksResponseSchema, system: CREATOR_SYSTEM, prompt });
});
