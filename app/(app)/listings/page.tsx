import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { decorate, LISTING_COLUMNS } from "@/lib/server/listings";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { CITIES } from "@/lib/config";
import { inputClass } from "@/components/ui/Field";
import type { Listing } from "@/lib/types";

export const metadata = { title: "Annonces" };
export const dynamic = "force-dynamic";

type SP = { city?: string; max?: string; before?: string; kind?: string; furnished?: string; sort?: string };

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user, profile, supabase } = await requireProfile();
  const city = CITIES.some((c) => c.slug === sp.city) ? sp.city! : profile.city;
  const max = Number(sp.max) > 0 ? Number(sp.max) : null;
  const sort = sp.sort === "price" || sp.sort === "recent" ? sp.sort : "compat";

  let query = supabase.from("listings").select(LISTING_COLUMNS).eq("status", "published").eq("city", city).limit(60);
  if (max) query = query.lte("total_monthly", max);
  if (sp.before && /^\d{4}-\d{2}-\d{2}$/.test(sp.before)) query = query.lte("available_from", sp.before);
  if (sp.kind === "room" || sp.kind === "entire") query = query.eq("kind", sp.kind);
  if (sp.furnished === "1") query = query.eq("furnished", true);
  query = sort === "price" ? query.order("total_monthly") : query.order("published_at", { ascending: false });
  const { data } = await query;
  const items = await decorate(user.id, supabase, (data ?? []) as Listing[]);
  if (sort === "compat") items.sort((a, b) => (b.compat ?? -1) - (a.compat ?? -1));

  return (
    <>
      <PageHeader title="Annonces" lead="Chaque annonce affiche ta compatibilité avec la personne qui la publie."
        action={<ButtonLink href="/listings/new" size="sm"><Plus className="h-4 w-4" aria-hidden />Publier</ButtonLink>} />
      <form className="mb-6 grid grid-cols-2 gap-2.5 rounded-[var(--radius-panel)] border border-line bg-paper p-3 sm:grid-cols-6" role="search">
        <label className="sr-only" htmlFor="f-city">Ville</label>
        <select id="f-city" name="city" defaultValue={city} className={inputClass}>{CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <label className="sr-only" htmlFor="f-max">Budget maximum</label>
        <input id="f-max" name="max" type="number" min={100} placeholder="Budget max €" defaultValue={sp.max} className={inputClass} />
        <label className="sr-only" htmlFor="f-before">Disponible avant le</label>
        <input id="f-before" name="before" type="date" defaultValue={sp.before} className={inputClass} title="Disponible avant le" />
        <label className="sr-only" htmlFor="f-kind">Type</label>
        <select id="f-kind" name="kind" defaultValue={sp.kind ?? ""} className={inputClass}>
          <option value="">Tous types</option><option value="room">Chambre</option><option value="entire">Logement entier</option>
        </select>
        <label className="sr-only" htmlFor="f-sort">Tri</label>
        <select id="f-sort" name="sort" defaultValue={sort} className={inputClass}>
          <option value="compat">Compatibilité</option><option value="price">Prix</option><option value="recent">Plus récentes</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="furnished" value="1" defaultChecked={sp.furnished === "1"} className="h-4 w-4 accent-door" />Meublé</label>
          <button className={buttonClass("primary", "sm", "ml-auto")}>Filtrer</button>
        </div>
      </form>
      {items.length === 0 ? (
        <EmptyState title="Aucune annonce pour ces critères" action={<ButtonLink href="/listings/new" variant="secondary">Publier une annonce</ButtonLink>}>
          Élargis ton budget ou ta date. Tu peux aussi former un groupe avec tes matchs pour chercher un logement entier.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => <ListingCard key={x.l.id} l={x.l} cover={x.cover} compat={x.compat} ownerName={x.ownerName} />)}
        </div>
      )}
    </>
  );
}
