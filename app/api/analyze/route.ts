import { CREATOR_SYSTEM, generate } from "@/lib/ai";
import { fetchPage } from "@/lib/fetchPage";
import { handler } from "@/lib/route";
import { AnalyzeRequest, BrandProfileSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = handler(AnalyzeRequest, async ({ url, notes }) => {
  if (!url?.trim() && !notes?.trim()) throw new Error("Give a URL or a description of the product.");
  let page = null;
  let fetchError: string | null = null;
  if (url?.trim()) {
    try {
      page = await fetchPage(url.trim());
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Couldn't fetch the page.";
      if (!notes?.trim()) throw new Error(fetchError);
    }
  }
  const prompt = `Build a social content brand profile for this product so we can write organic short-form videos about it.
${page ? `Page URL: ${page.url}\nTitle: ${page.title}\nMeta description: ${page.description}\nPage text${page.truncated ? " (first part of a long page)" : ""}:\n"""\n${page.text}\n"""` : ""}
${notes?.trim() ? `Notes from the founder:\n"""\n${notes.trim()}\n"""` : ""}
Ground every field in the material above; where it is silent, infer sensibly from the category. Write pain points the way the audience would say them out loud.`;
  const profile = await generate({ schema: BrandProfileSchema, system: CREATOR_SYSTEM, prompt, effort: "medium" });
  return { profile, source: page ? { url: page.url, title: page.title } : null, warning: fetchError };
});
