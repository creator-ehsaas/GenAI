import { brandContext, CREATOR_SYSTEM, generate } from "@/lib/ai";
import { handler } from "@/lib/route";
import { CaptionsRequest, CaptionsResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(CaptionsRequest, async ({ brand, posts }) => {
  const prompt = `${brandContext(brand)}

Write captions for these posts. "text" is what is on screen.
- caption: 1-3 short lines in a casual creator voice. The first line expands on the on-screen text without repeating it word for word; end with a soft call to action. Up to 2 emoji. Match the on-screen text's language.
- hashtags: 4-6 hashtags separated by single spaces, mixing niche and mid-size tags.
If a post already has a non-empty caption or hashtags, return that field unchanged.
Return one item per post with the same id.

Posts (JSON): ${JSON.stringify(posts)}`;
  return generate({ schema: CaptionsResponseSchema, system: CREATOR_SYSTEM, prompt });
});
