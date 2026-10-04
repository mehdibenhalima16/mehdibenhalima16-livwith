import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { compatibility, type MatchInput } from "@/lib/matching";
import { LIMITS } from "@/lib/config";
import type { DeckCard } from "@/lib/types";
import { toDeckCard, type PoolRow } from "@/lib/deck";
import { signPaths } from "./photos";
import { loadInputs } from "./compat";


/**
 * Pile de découverte : filtres impératifs en base (discovery_pool), score calculé ici,
 * puis seules les données publiques et le résultat sont envoyés au navigateur.
 */
export async function buildDeck(userId: string, exclude: string[] = []): Promise<DeckCard[]> {
  const admin = createAdminClient();
  const [{ data, error }, inputs] = await Promise.all([
    admin.rpc("discovery_pool", { p_user: userId, p_limit: 200 }),
    loadInputs([userId]),
  ]);
  if (error) throw error;
  const me = inputs.get(userId);
  if (!me) return [];
  const scored = ((data ?? []) as PoolRow[])
    .filter((row) => !exclude.includes(row.id))
    .map((row) => ({ row, r: compatibility(me, { lifestyle: row.lifestyle, preferences: row.preferences as MatchInput["preferences"] }) }))
    .filter((x): x is { row: PoolRow; r: NonNullable<typeof x.r> } => x.r !== null)
    .sort((a, b) => Number(a.row.is_demo) - Number(b.row.is_demo) || b.r.score - a.r.score)
    .slice(0, LIMITS.deckSize);

  const urls = await signPaths("avatars", scored.flatMap((s) => s.row.photos));
  return scored.map(({ row, r }) => toDeckCard(row, r, urls));
}
