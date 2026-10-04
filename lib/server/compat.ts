import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { compatibility, publicView, type CompatResult, type MatchInput } from "@/lib/matching";
import type { CompatSummary } from "@/lib/types";

export const toSummary = (r: CompatResult): CompatSummary => publicView(r);

/** Entrées de matching (réponses + attentes) lues côté serveur uniquement. */
export async function loadInputs(ids: string[]): Promise<Map<string, MatchInput>> {
  const map = new Map<string, MatchInput>();
  if (ids.length === 0) return map;
  const { data, error } = await createAdminClient().rpc("compat_inputs", { p_ids: [...new Set(ids)] });
  if (error) throw error;
  for (const row of (data ?? []) as { id: string; lifestyle: MatchInput["lifestyle"]; preferences: MatchInput["preferences"] }[]) {
    map.set(row.id, { lifestyle: row.lifestyle, preferences: row.preferences });
  }
  return map;
}

/**
 * Compatibilité de `me` avec des personnes que l'appelant a déjà le droit de voir (lues via la RLS).
 * null = un critère impératif n'est pas respecté.
 */
export async function compatWith(me: string, others: string[]): Promise<Map<string, CompatSummary | null>> {
  const inputs = await loadInputs([me, ...others]);
  const mine = inputs.get(me);
  const out = new Map<string, CompatSummary | null>();
  for (const id of others) {
    const other = inputs.get(id);
    const r = mine && other ? compatibility(mine, other) : null;
    out.set(id, r ? toSummary(r) : null);
  }
  return out;
}
