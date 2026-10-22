import { brandContext, CREATOR_SYSTEM, generate } from "@/lib/ai";
import { handler } from "@/lib/route";
import { SlideshowRequest, SlideshowResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(SlideshowRequest, async ({ brand, topic, slides, language }) => {
  const prompt = `${brandContext(brand)}

Write a ${slides}-slide TikTok/Instagram photo-carousel about: ${topic}
Language: ${language || "English"}
- Slide 1 is a scroll-stopping hook (max 12 words).
- Middle slides each carry one useful, specific point (max 22 words each), written so a reader wants to swipe.
- The last slide brings in the product naturally, as a tip rather than an ad.
- Also write a caption (1-3 short lines, soft CTA) and 4-6 hashtags separated by spaces.`;
  return generate({ schema: SlideshowResponseSchema, system: CREATOR_SYSTEM, prompt });
});
