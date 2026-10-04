import type { Lifestyle } from "./lifestyle";
import type { PublicCompat } from "./matching";

export interface Profile {
  id: string;
  first_name: string;
  gender: "woman" | "man" | "nonbinary" | null;
  occupation: string | null;
  bio: string;
  city: string;
  budget_min: number;
  budget_max: number;
  move_in_date: string;
  intents: ("room" | "host" | "team")[];
  photos: string[];
  lifestyle: Lifestyle;
  onboarded_at: string | null;
  is_paused: boolean;
  is_demo: boolean;
  suspended_at: string | null;
  last_active_at: string;
  age_years?: number | null;
}

export const PROFILE_COLUMNS =
  "id, first_name, gender, occupation, bio, city, budget_min, budget_max, move_in_date, intents, photos, lifestyle, onboarded_at, is_paused, is_demo, suspended_at, last_active_at, age_years";

export interface Listing {
  id: string;
  owner_id: string;
  kind: "room" | "entire";
  title: string;
  description: string;
  city: string;
  district: string | null;
  rent: number;
  charges: number;
  total_monthly: number;
  deposit: number | null;
  surface_m2: number | null;
  bedrooms: number | null;
  flatmates: number | null;
  furnished: boolean;
  available_from: string;
  min_duration_months: number | null;
  amenities: string[];
  photos: string[];
  status: "draft" | "pending_review" | "published" | "filled" | "archived" | "removed";
  review_reason: string | null;
  published_at: string | null;
  created_at: string;
}

/** Compatibilité telle qu'envoyée au navigateur : voir publicView dans lib/matching. */
export type CompatSummary = PublicCompat;

/** Carte de découverte envoyée au navigateur : jamais les préférences de l'autre. */
export interface DeckCard {
  id: string;
  firstName: string;
  age: number | null;
  occupation: string | null;
  bio: string;
  city: string;
  budgetMin: number;
  budgetMax: number;
  moveInDate: string;
  intents: string[];
  photos: string[];
  isDemo: boolean;
  lifestyle: Lifestyle;
  compat: CompatSummary;
}
