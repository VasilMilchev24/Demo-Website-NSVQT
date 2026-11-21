import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** SEO fields shared by every content entry. `title` is the page-specific part; the layout appends the brand. */
const seo = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

/**
 * Service page sections, rendered in order by /uslugi/[slug]/. Each maps to one block component.
 * `flush` removes the section's top padding (the original's `padding-top:0`).
 */
const base = { flush: z.boolean().default(false) };
const serviceSection = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('intro'),
    eyebrow: z.string(),
    statement: z.string(),
    size: z.enum(['l', 'm']).default('l'),
    paragraphs: z.array(z.string()).min(1),
  }),
  z.object({
    ...base,
    type: z.literal('scope'),
    eyebrow: z.string(),
    title: z.string(),
    lead: z.string().optional(),
    groups: z.array(z.object({ title: z.string(), items: z.array(z.string()).min(1), note: z.string().optional() })),
    footnote: z.string().optional(),
  }),
  z.object({
    ...base,
    type: z.literal('steps'),
    eyebrow: z.string(),
    title: z.string(),
    lead: z.string().optional(),
    backgroundWord: z.string().optional(),
    link3d: z.boolean().default(false),
    /** single-line steps (title only) */
    compact: z.boolean().default(false),
    items: z.array(z.object({ title: z.string(), text: z.string().optional() })).min(1),
  }),
  z.object({
    ...base,
    type: z.literal('questions'),
    eyebrow: z.string(),
    title: z.string(),
    lead: z.string(),
    items: z.array(z.string()).min(1),
    footnote: z.string(),
  }),
  z.object({
    ...base,
    type: z.literal('why'),
    eyebrow: z.string(),
    title: z.string(),
    lead: z.string().optional(),
    dark: z.boolean().default(false),
    items: z.array(z.object({ title: z.string(), text: z.string() })).min(1).max(6),
  }),
  z.object({ ...base, type: z.literal('facade-stats') }),
  z.object({
    ...base,
    type: z.literal('roof-solutions'),
    eyebrow: z.string(),
    title: z.string(),
    items: z.array(z.object({ variant: z.enum(['guma', 'bitum']), title: z.string(), text: z.string() })).length(2),
    paragraphs: z.array(z.string()),
  }),
  /** Closing text block: the Markdown body of the entry, with optional heading / eyebrow / signature. */
  z.object({
    ...base,
    type: z.literal('closing'),
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    signature: z.string().optional(),
  }),
]);
export type ServiceSection = z.infer<typeof serviceSection>;

/** Services ("Услуги"). Drives the mega-menu, mobile menu, footer, service cards and /uslugi/[slug]/. */
const uslugi = defineCollection({
  loader: glob({ base: './src/content/uslugi', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      order: z.number().int().positive(),
      title: z.string(),
      /** Short label in the mobile menu ("Баня"). */
      shortTitle: z.string(),
      /** One-liner used in the mega-menu and as the service hero subtitle. */
      tagline: z.string(),
      /** Paragraph on the stacked service cards (home, /uslugi/). */
      cardText: z.string(),
      chips: z.array(z.string()).min(1),
      image: image(),
      /** Wide H1 style (`.dalgo`) on the service hero — every service except the bathroom page. */
      heroLong: z.boolean().default(true),
      sections: z.array(serviceSection).min(1),
      seo,
    }),
});

/** Completed projects ("Завършени обекти"). Photo alt texts are generated: "<title>, снимка N". */
const obekti = defineCollection({
  loader: glob({ base: './src/content/obekti', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      order: z.number().int().positive(),
      title: z.string(),
      /** Location chip, e.g. "Център, Варна". */
      location: z.string(),
      /** Home type label, e.g. "Двустаен". */
      homeType: z.string(),
      /** One-line summary on cards. */
      lead: z.string(),
      /** Paragraph on the /zavarsheni-obekti/ list. */
      intro: z.string(),
      renovation: z.string(),
      photos: z.array(image()).min(1),
      /** Index into `photos` of the main card image, and of the secondary (hover) image. */
      cover: z.number().int().nonnegative(),
      coverHover: z.number().int().nonnegative(),
      seo,
    }),
});

/** Blog articles. Category is required (the original shipped one article without — G-11). */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      category: z.string().min(1),
      image: image(),
      /** Lead shown on the featured (first) card of /blog/. */
      excerpt: z.string().optional(),
      seo,
    }),
});

/**
 * "Как работим" steps. Drives /kak-rabotim/ (big cards), /kak-rabotim/[slug]/ and the home step cards.
 * `media`: a photo, or one of the animated document mocks (offer / contract).
 */
const kakRabotim = defineCollection({
  loader: glob({ base: './src/content/kak-rabotim', pattern: '**/*.md' }),
  schema: ({ image }) => {
    const photo = z.object({ image: image(), alt: z.string(), credit: z.string() });
    return z.object({
      order: z.number().int().positive(),
      title: z.string(),
      icon: z.enum(['inspect', 'offer', 'contract', 'tools', 'sparkle']),
      /** Wide H1 style (`.dalgo`) on the step hero — only "Професионално изпълнение" in the original. */
      heroLong: z.boolean().default(false),
      /** Hero lead on the step page. */
      lead: z.string(),
      /** Statement next to the step number; also the text of the home step cards. */
      statement: z.string(),
      /** Text on the /kak-rabotim/ card; also the first paragraph of the step page (body continues). */
      summary: z.string(),
      media: z.discriminatedUnion('type', [
        z.object({ type: z.literal('photo'), ...photo.shape }),
        z.object({ type: z.literal('offer') }),
        z.object({ type: z.literal('contract') }),
      ]),
      quote: z.object({ text: z.string(), caption: z.string(), photo: photo.optional() }),
      seo,
    });
  },
});

export const collections = { uslugi, obekti, blog, 'kak-rabotim': kakRabotim };
