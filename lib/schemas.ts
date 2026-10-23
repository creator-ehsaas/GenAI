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

/* ---------- competitor ads ---------- */

export const AD_PLATFORMS = ["tiktok", "instagram", "facebook", "youtube", "other"] as const;

export const CompetitorAdSchema = z.object({
  platform: z.enum(AD_PLATFORMS),
  format: z.string().describe("Creative format, e.g. 'UGC talking head', 'screen demo', 'slideshow', 'meme', 'static image', 'founder story'"),
  hook: z.string().describe("The first line or on-screen text that stops the scroll, verbatim where possible"),
  body: z.string().describe("The rest of the copy or a short summary of what is said and shown"),
  cta: z.string().describe("Call to action, empty if none"),
  offer: z.string().describe("Discount, trial, guarantee or other offer, empty if none"),
  angle: z.string().describe("The pain, desire or belief the ad plays on, in a few words"),
  visual: z.string().describe("What is on screen: person, setting, text style, pacing. Empty for text-only sources"),
  daysRunning: z.number().nullable().describe("How long the ad has been running in days when known, else null"),
  sourceUrl: z.string().describe("Where the ad was seen, empty if unknown"),
});
export type CompetitorAd = z.infer<typeof CompetitorAdSchema>;

export const ExtractAdsResponseSchema = z.object({ ads: z.array(CompetitorAdSchema) });

export const CompetitorResearchSchema = z.object({
  positioning: z.string().describe("How the competitor positions itself and to whom, 2-3 sentences"),
  channels: z.array(z.string()).describe("Where they market: platforms, creators, ad networks"),
  ads: z.array(CompetitorAdSchema).describe("Ads, campaigns or organic videos found, each with its source URL"),
  notes: z.array(z.string()).describe("Other notable observations with the source in brackets"),
});
export type CompetitorResearch = z.infer<typeof CompetitorResearchSchema>;

export const PatternReportSchema = z.object({
  summary: z.string().describe("3-4 sentences: what the category's ads have in common and what that says about the buyer"),
  hookPatterns: z.array(
    z.object({
      name: z.string().describe("Short name for the hook shape, e.g. 'Fake-candid confession'"),
      template: z.string().describe("Reusable template with [brackets] for the variable parts"),
      count: z.number().describe("How many of the analyzed ads use it"),
      competitors: z.array(z.string()),
      examples: z.array(z.string()).describe("Up to 3 verbatim hooks"),
      why: z.string().describe("Why it works on this audience"),
    }),
  ),
  angles: z.array(
    z.object({
      angle: z.string(),
      competitors: z.array(z.string()),
      saturation: z.enum(["crowded", "contested", "open"]).describe("How many competitors lean on it"),
    }),
  ),
  formats: z.array(z.object({ format: z.string(), count: z.number(), notes: z.string() })),
  ctas: z.array(z.string()).describe("Common calls to action, most common first"),
  offers: z.array(z.string()).describe("Offers seen, empty if none"),
  longRunners: z
    .array(z.object({ competitor: z.string(), hook: z.string(), daysRunning: z.number(), whyItLasts: z.string() }))
    .describe("Ads with the longest known run time; long-running paid ads are usually profitable. Empty if no run times are known"),
  gaps: z.array(z.object({ opportunity: z.string(), why: z.string() })).describe("Angles, audiences or formats nobody is using well"),
  playbook: z
    .array(
      z.object({
        title: z.string(),
        format: z.enum(FORMATS),
        hookTemplate: z.string(),
        exampleHook: z.string().describe("The template filled in for OUR brand"),
        rationale: z.string().describe("Which pattern or gap it builds on and how it differs from competitors"),
      }),
    )
    .describe("5-8 plays for our brand that borrow what works and exploit the gaps, never copying a competitor's wording"),
});
export type PatternReport = z.infer<typeof PatternReportSchema>;

const CompetitorRef = z.object({ name: z.string().min(1), url: z.string().optional() });

export const ExtractAdsRequest = z.object({
  competitor: CompetitorRef,
  text: z.string().max(60_000).optional(),
  images: z
    .array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]), data: z.string() }))
    .max(10)
    .optional(),
});

export const ResearchRequest = z.object({ competitor: CompetitorRef });

export const MetaAdsRequest = z.object({
  query: z.string().min(1),
  countries: z.array(z.string().length(2)).min(1).max(10).default(["DE", "FR", "NL"]),
  limit: z.number().int().min(1).max(100).default(30),
  activeOnly: z.boolean().default(false),
});

export const PatternsRequest = z.object({
  brand: BrandInputSchema,
  competitors: z
    .array(
      z.object({
        name: z.string(),
        positioning: z.string().optional(),
        ads: z.array(CompetitorAdSchema.partial()).max(200),
      }),
    )
    .min(1),
});
