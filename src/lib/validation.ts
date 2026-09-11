import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .email("Enter a valid email address");

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{1,50}$/);

/**
 * Bid-intent request. `amount` is the target LIFETIME total in MAJOR units
 * ("17006"), submitted as a string for UX. The server re-parses and re-validates
 * it and computes the actual charge.
 */
export const createBidSchema = z
  .object({
    listingId: z.string().cuid().optional(),
    instagram: z.string().trim().min(1).max(300).optional(),
    categorySlug: slug.optional(),
    amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
    // Optional — Dodo's own hosted checkout collects the paying email; we
    // don't need to ask twice. See src/lib/bids.ts for the guest fallback.
    email: emailSchema.optional(),
    // Optional — a self-supplied photo for the leaderboard row/ticket. We
    // never scrape Instagram for this (see src/lib/instagram-avatar.ts).
    avatarUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
    intendedTop: z.boolean().optional(),
  })
  .refine((d) => d.listingId || (d.instagram && d.categorySlug), {
    message: "Provide either a listingId, or an instagram handle and category",
    path: ["listingId"],
  });

export type CreateBidInput = z.infer<typeof createBidSchema>;

export const lookupQuerySchema = z.object({ q: z.string().trim().min(1).max(300) });

export const boardQuerySchema = z.object({
  board: z.enum(["all", "today", "daily"]).default("all"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  category: slug.optional(),
  page: z.coerce.number().int().min(1).max(2000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ---- Admin ----------------------------------------------------------------

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,50}$/, "Slug must be lowercase letters, numbers and hyphens"),
  description: z.string().trim().max(300).default(""),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const categoryUpdateSchema = categoryInputSchema.partial();

export const categoryReorderSchema = z.object({ order: z.array(z.string().cuid()).min(1) });

export const settingsUpdateSchema = z.object({
  startingBidCents: z.coerce.number().int().min(1).max(1_000_000_00).optional(),
  minIncrementCents: z.coerce.number().int().min(1).max(1_000_00).optional(),
  takeTopIncrementCents: z.coerce.number().int().min(0).max(1_000_000_00).optional(),
  maxBidCents: z.coerce.number().int().min(1000).max(100_000_000_00).optional(),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  todayWindowHours: z.coerce.number().int().min(1).max(168).optional(),
  dailyBoardEnabled: z.boolean().optional(),
  listingsEnabled: z.boolean().optional(),
  biddingEnabled: z.boolean().optional(),
  autoRefundVoided: z.boolean().optional(),
});

export const adminListingActionSchema = z.object({
  action: z.enum(["enable", "disable", "remove", "reinstate", "recalc"]),
});

export const adminChangeCategorySchema = z.object({ categoryId: z.string().cuid() });
