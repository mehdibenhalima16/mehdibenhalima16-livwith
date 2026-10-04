import { publicView, type CompatResult } from "./matching";
import type { Lifestyle } from "./lifestyle";
import type { DeckCard } from "./types";

/** Ligne de la découverte côté serveur (inclut les attentes privées, jamais transmises). */
export interface PoolRow {
  id: string; first_name: string; occupation: string | null; bio: string; city: string;
  budget_min: number; budget_max: number; move_in_date: string; intents: string[]; photos: string[];
  is_demo: boolean; age: number | null; lifestyle: Lifestyle; preferences: unknown;
}

/** Construit la carte envoyée au navigateur, champ par champ (liste blanche). */
export function toDeckCard(row: PoolRow, r: CompatResult, signed: Record<string, string>): DeckCard {
  return {
    id: row.id,
    firstName: row.first_name,
    age: row.age,
    occupation: row.occupation,
    bio: row.bio,
    city: row.city,
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    moveInDate: row.move_in_date,
    intents: row.intents,
    photos: row.photos.map((p) => signed[p]).filter(Boolean),
    isDemo: row.is_demo,
    lifestyle: row.lifestyle,
    compat: publicView(r),
  };
}
