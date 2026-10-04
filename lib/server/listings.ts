import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing } from "@/lib/types";
import { signPaths } from "./photos";
import { compatWith } from "./compat";

export const LISTING_COLUMNS =
  "id, owner_id, kind, title, description, city, district, rent, charges, total_monthly, deposit, surface_m2, bedrooms, flatmates, furnished, available_from, min_duration_months, amenities, photos, status, review_reason, published_at, created_at";

/** Couvertures signées + compatibilité avec chaque offreur (hors ses propres annonces). */
export async function decorate(me: string, supabase: SupabaseClient, listings: Listing[]) {
  const owners = [...new Set(listings.map((l) => l.owner_id).filter((o) => o !== me))];
  const [covers, compat, names] = await Promise.all([
    signPaths("listing-photos", listings.map((l) => l.photos[0])),
    compatWith(me, owners),
    owners.length ? supabase.from("profiles").select("id, first_name").in("id", owners) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = Object.fromEntries(((names.data ?? []) as { id: string; first_name: string }[]).map((p) => [p.id, p.first_name]));
  return listings.map((l) => ({
    l,
    cover: l.photos[0] ? covers[l.photos[0]] : undefined,
    compat: l.owner_id === me ? null : compat.get(l.owner_id)?.score ?? null,
    ownerName: nameOf[l.owner_id],
  }));
}
