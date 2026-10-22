import { z } from "zod";

/** Content formats the studio can produce. */
export const FORMATS = ["hook_video", "hook_demo", "slideshow", "meme"] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  hook_video: "Hook video",
  hook_demo: "Hook + demo",
  slideshow: "Slideshow",
  meme: "Meme",
};

export const FORMAT_BLURBS: Record<Format, string> = {
  hook_video: "A scroll-stopping line of text over a selfie-style clip.",
  hook_demo: "A 2–3 s reaction hook that cuts to your product demo.",
  slideshow: "A swipeable 4–7 slide story with one idea per slide.",
  meme: "Top and bottom text over a relatable clip or image.",
};

export const BrandProfileSchema = z.object({
  name: z.string().describe("Product or brand name"),
  oneLiner: z.string().describe("What it is, in under 15 words"),
  description: z.string().describe("Two or three sentences on what it does and for whom"),
  category: z.string().describe("Product category, e.g. 'study planner app'"),
  audiences: z.array(z.string()).describe("3-5 specific audience segments"),
  painPoints: z.array(z.string()).describe("4-6 pains the audience feels, in their own words"),
  benefits: z.array(z.string()).describe("4-6 concrete outcomes the product gives"),
  tone: z.string().describe("Voice to use on social, e.g. 'playful, self-deprecating Gen Z'"),
  keywords: z.array(z.string()).describe("6-10 topic keywords"),
  hashtags: z.array(z.string()).describe("8-12 relevant hashtags with the # sign, niche and mid-size, no #fyp/#viral"),
  ctas: z.array(z.string()).describe("3-4 soft calls to action, e.g. 'link in bio'"),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const IdeaSchema = z.object({
  format: z.enum(FORMATS),
  title: z.string().describe("Short internal name for the idea"),
  angle: z.string().describe("Which pain, desire or audience it targets and why it should work"),
  hook: z.string().describe("On-screen hook text, max 14 words"),
  slides: z
    .array(z.string())
    .describe("For slideshow: 4-7 slide texts, the first is the hook. For meme: [top text, bottom text]. Otherwise empty."),
  demoLabel: z.string().describe("For hook_demo: short on-screen label over the demo part. Otherwise empty."),
  caption: z.string().describe("Post caption, 1-3 short lines, ends with a soft CTA"),
  hashtags: z.string().describe("4-6 hashtags separated by single spaces"),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const IdeasResponseSchema = z.object({ ideas: z.array(IdeaSchema) });

export const CaptionItemSchema = z.object({
  id: z.string(),
  caption: z.string(),
  hashtags: z.string(),
});
export const CaptionsResponseSchema = z.object({ items: z.array(CaptionItemSchema) });

export const HooksResponseSchema = z.object({ hooks: z.array(z.string()) });

export const SlideshowResponseSchema = z.object({
  slides: z.array(z.string()),
  caption: z.string(),
  hashtags: z.string(),
});

export const InsightsResponseSchema = z.object({
  summary: z.string().describe("Two or three sentences on what is working and what is not"),
  winners: z.array(z.string()).describe("Patterns shared by the best posts"),
  recommendations: z.array(z.string()).describe("3-5 specific next posts or experiments"),
});
export type Insights = z.infer<typeof InsightsResponseSchema>;

/* ---------- request bodies ---------- */

export const BrandInputSchema = BrandProfileSchema.partial().nullable().optional();

export const AnalyzeRequest = z.object({
  url: z.string().optional(),
  notes: z.string().optional(),
});

export const IdeasRequest = z.object({
  brand: BrandInputSchema,
  formats: z.array(z.enum(FORMATS)).min(1),
  count: z.number().int().min(1).max(20).default(8),
  focus: z.string().optional(),
  avoid: z.array(z.string()).optional(),
  language: z.string().optional(),
});

export const CaptionsRequest = z.object({
  brand: BrandInputSchema,
  posts: z
    .array(
      z.object({
        id: z.string(),
        format: z.enum(FORMATS).optional(),
        text: z.string(),
        caption: z.string().optional(),
        hashtags: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const HooksRequest = z.object({
  brand: BrandInputSchema,
  count: z.number().int().min(1).max(30).default(8),
  template: z.string().optional(),
  avoid: z.array(z.string()).optional(),
  language: z.string().optional(),
});

export const SlideshowRequest = z.object({
  brand: BrandInputSchema,
  topic: z.string().min(1),
  slides: z.number().int().min(3).max(10).default(5),
  language: z.string().optional(),
});

export const InsightsRequest = z.object({
  brand: BrandInputSchema,
  posts: z
    .array(
      z.object({
        format: z.string(),
        text: z.string(),
        platform: z.string().optional(),
        views: z.number(),
        likes: z.number(),
        comments: z.number(),
        shares: z.number(),
        saves: z.number(),
      }),
    )
    .min(1),
});
