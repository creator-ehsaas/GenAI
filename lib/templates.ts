import type { Format } from "./schemas";

export type Template = {
  id: string;
  name: string;
  format: Format;
  template: string;
  example: string;
  why: string;
  tags: string[];
};

/** Proven short-form structures. The template string is filled in by the AI for your product. */
export const TEMPLATES: Template[] = [
  { id: "pov", name: "POV", format: "hook_video", template: "POV: you [relatable situation the product fixes]", example: "POV: you finally stopped forgetting assignment deadlines", why: "Viewers project themselves into the scene; low effort to watch, high relatability.", tags: ["relatable", "evergreen"] },
  { id: "nobody", name: "Nobody tells you", format: "hook_video", template: "Things nobody tells you about [topic the audience cares about]", example: "Things nobody tells you about your first semester", why: "Implies insider knowledge; works with neutral stock clips.", tags: ["curiosity", "stock-safe"] },
  { id: "acting-normal", name: "Acting normal", format: "hook_video", template: "Me acting normal after [discovering the product's main benefit]", example: "Me acting normal after finding the best study hack", why: "Reaction format. The clip does the emotional work, the text gives context.", tags: ["reaction", "meme-adjacent"] },
  { id: "stop", name: "Stop doing this", format: "hook_video", template: "Stop [common mistake the audience makes] (do this instead)", example: "Stop rewriting your to-do list every morning", why: "Pattern interrupt + a promise of a better way.", tags: ["contrarian"] },
  { id: "wish", name: "I wish I knew", format: "hook_video", template: "I wish I knew this before [milestone]", example: "I wish I knew this before my first job", why: "Regret framing makes viewers want to avoid the mistake.", tags: ["story"] },
  { id: "unpopular", name: "Unpopular opinion", format: "hook_video", template: "Unpopular opinion: [mild hot take about the category]", example: "Unpopular opinion: planners are useless if they take 30 minutes a day", why: "Invites comments and debate, which pushes distribution.", tags: ["comments", "debate"] },
  { id: "reaction-demo", name: "Reaction → demo", format: "hook_demo", template: "When you realize [product] can [surprising capability]", example: "When you realize this app turns your timetable into a to-do list", why: "The reaction earns 2 seconds; the demo proves the claim.", tags: ["app", "conversion"] },
  { id: "dont-download", name: "Don't download this", format: "hook_demo", template: "Don't download [product] if you [ironic reason]", example: "Don't download this app if you enjoy missing deadlines", why: "Reverse psychology hook with a built-in product reveal.", tags: ["app", "playful"] },
  { id: "secret", name: "Gatekept", format: "hook_demo", template: "The [category] that feels illegal to know about", example: "The study app that feels illegal to know about", why: "Scarcity + secrecy; ends on the product.", tags: ["app", "curiosity"] },
  { id: "listicle", name: "Listicle carousel", format: "slideshow", template: "[N] [things] that [outcome] (#[k] changed everything)", example: "5 habits that got me through finals (#4 changed everything)", why: "Carousels earn swipes and saves, which the algorithm rewards.", tags: ["saves", "educational"] },
  { id: "mistakes", name: "Mistakes carousel", format: "slideshow", template: "[N] mistakes I made [doing the thing] so you don't have to", example: "4 mistakes I made as a new freelancer so you don't have to", why: "Story + utility. The last slide recommends the product as the fix.", tags: ["story", "educational"] },
  { id: "starter", name: "Starter pack", format: "slideshow", template: "The [audience] starter pack", example: "The college freshman starter pack", why: "Identity content gets shared to friends who fit it.", tags: ["shares", "identity"] },
  { id: "drake", name: "Expectation vs reality", format: "meme", template: "[What people expect] | [What actually happens]", example: "Me planning my week on Sunday | Me on Monday at 11pm", why: "Universal meme shape, instantly readable.", tags: ["meme", "relatable"] },
  { id: "nobody-meme", name: "Nobody: / Me:", format: "meme", template: "Nobody: | Me: [over-the-top behavior tied to the product]", example: "Nobody: | Me at 2am color-coding my exam schedule", why: "Self-deprecating humor builds affinity without selling.", tags: ["meme", "humor"] },
];
