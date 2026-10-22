import { brandContext, CREATOR_SYSTEM, generate } from "@/lib/ai";
import { handler } from "@/lib/route";
import { InsightsRequest, InsightsResponseSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(InsightsRequest, async ({ brand, posts }) => {
  const prompt = `${brandContext(brand)}

Here are published posts with their results (JSON): ${JSON.stringify(posts)}

Compare the posts by views and by engagement rate ((likes+comments+shares+saves)/views). Say what the best ones share (format, hook shape, topic, length of hook), what underperformed, and recommend 3-5 specific next posts or experiments, each with a concrete hook. Be honest when the sample is too small to conclude much.`;
  return generate({ schema: InsightsResponseSchema, system: CREATOR_SYSTEM, prompt, effort: "medium" });
});
