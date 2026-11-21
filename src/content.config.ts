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

export const collections = { uslugi };
