import { z } from "zod";
import { AMENITIES, CITY_SLUGS, LIMITS } from "./config";
import { DIMENSIONS, maxOf, type Dim } from "./lifestyle";

const intRange = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

export const lifestyleSchema = z.object(
  Object.fromEntries(DIMENSIONS.map((d) => [d, intRange(1, maxOf(d))])) as unknown as Record<Dim, z.ZodType<number>>,
);
export const preferencesSchema = z.object(
  Object.fromEntries(
    DIMENSIONS.map((d) => [d, z.object({
      accept: z.array(intRange(1, maxOf(d))).min(1).max(maxOf(d)),
      importance: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    })]),
  ) as unknown as Record<Dim, z.ZodType<{ accept: number[]; importance: 0 | 1 | 2 | 3 }>>,
);

export function isAdult(birth: string, today = new Date()) {
  const b = new Date(`${birth}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return false;
  const limit = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return b <= limit && b.getUTCFullYear() > 1920;
}

const photoPaths = (max: number) => z.array(z.string().min(3).max(200).regex(/^[0-9a-f-]{36}\/[\w.-]+$/)).max(max);

export const basicsSchema = z.object({
  first_name: z.string().trim().min(1, "Indique ton prénom").max(40),
  gender: z.enum(["woman", "man", "nonbinary"]).nullable(),
  occupation: z.string().trim().max(60).default(""),
  bio: z.string().trim().max(600).default(""),
  city: z.enum(CITY_SLUGS),
  budget_min: intRange(100, 5000),
  budget_max: intRange(100, 5000),
  move_in_date: isoDate,
  intents: z.array(z.enum(["room", "host", "team"])).min(1, "Choisis au moins une intention").max(3),
  photos: photoPaths(LIMITS.profilePhotos),
}).refine((v) => v.budget_min <= v.budget_max, { message: "Le budget minimum dépasse le maximum", path: ["budget_max"] });

export const onboardingSchema = z.object({
  basics: basicsSchema,
  birth_date: isoDate.refine((d) => isAdult(d), "Livwith est réservé aux personnes majeures"),
  lifestyle: lifestyleSchema,
  preferences: preferencesSchema,
  age_min: intRange(18, 99),
  age_max: intRange(18, 99),
  household_pref: z.enum(["any", "women", "men"]),
}).refine((v) => v.age_min <= v.age_max, { message: "Tranche d'âge invalide", path: ["age_max"] })
  .refine((v) => v.basics.photos.length >= 1, { message: "Ajoute au moins une photo", path: ["basics", "photos"] });

export const listingSchema = z.object({
  kind: z.enum(["room", "entire"]),
  title: z.string().trim().min(8, "Titre trop court (8 caractères minimum)").max(90),
  description: z.string().trim().min(30, "Description trop courte (30 caractères minimum)").max(3000),
  city: z.enum(CITY_SLUGS),
  district: z.string().trim().max(60).default(""),
  rent: intRange(50, 20000),
  charges: intRange(0, 2000),
  deposit: intRange(0, 40000).nullable(),
  surface_m2: intRange(5, 500).nullable(),
  bedrooms: intRange(1, 12).nullable(),
  flatmates: intRange(0, 12).nullable(),
  furnished: z.boolean(),
  available_from: isoDate,
  min_duration_months: intRange(1, 36).nullable(),
  amenities: z.array(z.enum(AMENITIES.map((a) => a.value) as [string, ...string[]])).max(20),
  photos: photoPaths(LIMITS.listingPhotos),
  publish: z.boolean(),
});
export type ListingInput = z.infer<typeof listingSchema>;

export const passwordSchema = z.string().min(8, "8 caractères minimum").max(72);
export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254);

/** Redirection interne uniquement (évite les redirections ouvertes). */
export function safeNext(next: string | null | undefined, fallback = "/discover") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Données invalides";
