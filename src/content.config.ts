import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** SEO fields shared by every content entry. `title` is the page-specific part; the layout appends the brand. */
const seo = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

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

export const collections = { uslugi, obekti, blog };
