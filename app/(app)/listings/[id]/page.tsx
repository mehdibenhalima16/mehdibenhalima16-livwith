/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Home, MapPin, Ruler, Users } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { compatWith } from "@/lib/server/compat";
import { LISTING_COLUMNS } from "@/lib/server/listings";
import { conversationWith, myActiveGroups } from "@/lib/server/relations";
import { AMENITIES, cityName } from "@/lib/config";
import { euros, longDate } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { Avatar, DemoBadge } from "@/components/ui/Avatar";
import { CompatBadge } from "@/components/compat/CompatMeter";
import { Notice } from "@/components/ui/Field";
import { STATUS_LABEL } from "@/components/listings/ListingCard";
import { OwnerActions, RequestResponse, SeekerActions } from "@/components/listings/ListingActions";
import { ReportButton } from "@/components/safety/SafetyActions";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user, supabase } = await requireProfile();
  const { data } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;
  const mine = l.owner_id === user.id;

  const [{ data: owner }, photoUrls] = await Promise.all([
    supabase.from("profiles").select("id, first_name, photos, occupation, is_demo, age_years").eq("id", l.owner_id).maybeSingle(),
    signPaths("listing-photos", l.photos),
  ]);
  const ownerPhoto = owner ? (await signPaths("avatars", [owner.photos[0]]))[owner.photos[0]] : undefined;

  let seeker: React.ReactNode = null;
  let ownerPanel: React.ReactNode = null;
  if (!mine && owner) {
    const [compat, conv, fav, swipe, groups] = await Promise.all([
      compatWith(user.id, [owner.id]),
      conversationWith(supabase, user.id, owner.id),
      supabase.from("favorites").select("listing_id").eq("user_id", user.id).eq("listing_id", l.id).maybeSingle(),
      supabase.from("swipes").select("liked").eq("swiper", user.id).eq("target", owner.id).maybeSingle(),
      myActiveGroups(supabase, user.id),
    ]);
    const { data: shortlisted } = groups.length
      ? await supabase.from("group_listings").select("group_id").eq("listing_id", l.id).in("group_id", groups.map((g) => g.id))
      : { data: [] as { group_id: string }[] };
    const c = compat.get(owner.id);
    seeker = (
      <>
        <Link href={`/u/${owner.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-door">
          <Avatar src={ownerPhoto} name={owner.first_name} size={52} />
          <div className="flex-1">
            <p className="flex items-center gap-2 font-semibold">{owner.first_name}{owner.age_years ? `, ${owner.age_years} ans` : ""}{owner.is_demo && <DemoBadge />}</p>
            <p className="text-sm text-muted">{owner.occupation ?? "Publie cette annonce"}</p>
          </div>
          {c ? <CompatBadge score={c.score} size="sm" /> : <span className="text-xs text-muted">Critère impératif non compatible</span>}
        </Link>
        <SeekerActions listingId={l.id} ownerId={owner.id} ownerName={owner.first_name} favorite={Boolean(fav.data)}
          requested={Boolean(swipe.data?.liked)} conversationId={conv}
          groups={groups.map((g) => ({ ...g, shortlisted: (shortlisted ?? []).some((s) => s.group_id === g.id) }))} />
        <ReportButton kind="listing" id={l.id} label="Signaler l'annonce" />
      </>
    );
  }

  if (mine) {
    const { data: reqs } = await supabase.from("swipes").select("swiper, created_at").eq("target", user.id).eq("listing_id", l.id).eq("liked", true);
    const { data: answered } = await supabase.from("swipes").select("target").eq("swiper", user.id).in("target", (reqs ?? []).map((r) => r.swiper));
    const pendingIds = (reqs ?? []).map((r) => r.swiper).filter((s) => !(answered ?? []).some((a) => a.target === s));
    const [{ data: people }, compat] = await Promise.all([
      pendingIds.length ? supabase.from("profiles").select("id, first_name, photos, occupation, age_years, is_demo").in("id", pendingIds) : Promise.resolve({ data: [] as { id: string; first_name: string; photos: string[]; occupation: string | null; age_years: number | null; is_demo: boolean }[] }),
      compatWith(user.id, pendingIds),
    ]);
    const avatars = await signPaths("avatars", (people ?? []).map((p) => p.photos[0]));
    const sorted = [...(people ?? [])].sort((a, b) => (compat.get(b.id)?.score ?? 0) - (compat.get(a.id)?.score ?? 0));
    ownerPanel = (
      <>
        <p className="text-sm"><span className="font-semibold">Statut :</span> {STATUS_LABEL[l.status]}</p>
        {l.review_reason && <Notice tone="warning">{l.review_reason}</Notice>}
        <OwnerActions id={l.id} status={l.status} />
        <div>
          <h2 className="mb-2 font-display text-lg font-bold">Demandes reçues ({sorted.length})</h2>
          {sorted.length === 0 ? <p className="text-sm text-muted">Aucune demande en attente.</p> : (
            <ul className="space-y-2">
              {sorted.map((p) => (
                <li key={p.id} className="rounded-2xl border border-line p-3">
                  <Link href={`/u/${p.id}`} className="flex items-center gap-3">
                    <Avatar src={avatars[p.photos[0]]} name={p.first_name} size={40} />
                    <span className="flex-1 font-semibold">{p.first_name}{p.age_years ? `, ${p.age_years}` : ""}</span>
                    {compat.get(p.id) && <CompatBadge score={compat.get(p.id)!.score} size="sm" />}
                  </Link>
                  <div className="mt-2 flex justify-end"><RequestResponse seekerId={p.id} listingId={l.id} name={p.first_name} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  const facts = [
    { icon: Home, text: l.kind === "room" ? "Chambre en colocation" : "Logement entier" },
    { icon: MapPin, text: [l.district, cityName(l.city)].filter(Boolean).join(", ") },
    { icon: Calendar, text: `Disponible le ${longDate(l.available_from)}` },
    l.surface_m2 ? { icon: Ruler, text: `${l.surface_m2} m²${l.bedrooms ? ` · ${l.bedrooms} chambre${l.bedrooms > 1 ? "s" : ""}` : ""}` } : null,
    l.flatmates != null && l.kind === "room" ? { icon: Users, text: `${l.flatmates} colocataire${l.flatmates > 1 ? "s" : ""} sur place` } : null,
  ].filter(Boolean) as { icon: typeof Home; text: string }[];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-[var(--radius-card)]">
          {l.photos.map((p, i) => (
            <img key={p} src={photoUrls[p]} alt={`Photo ${i + 1} de l'annonce`} className="aspect-[4/3] w-full shrink-0 snap-center rounded-[var(--radius-panel)] object-cover sm:w-[85%]" />
          ))}
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold leading-tight">{l.title}</h1>
        <p className="mt-2 font-display text-2xl font-bold text-door">{euros(l.total_monthly)} <span className="text-base font-medium text-muted">par mois charges comprises ({euros(l.rent)} + {euros(l.charges)})</span></p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {facts.map(({ icon: Icon, text }) => <li key={text} className="flex items-center gap-2 text-[15px]"><Icon className="h-5 w-5 text-door" aria-hidden />{text}</li>)}
        </ul>
        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed">{l.description}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 rounded-[var(--radius-panel)] border border-line bg-paper p-4 text-sm">
          <div><dt className="text-muted">Meublé</dt><dd className="font-semibold">{l.furnished ? "Oui" : "Non"}</dd></div>
          <div><dt className="text-muted">Dépôt de garantie</dt><dd className="font-semibold">{l.deposit != null ? euros(l.deposit) : "Non précisé"}</dd></div>
          <div><dt className="text-muted">Durée minimale</dt><dd className="font-semibold">{l.min_duration_months ? `${l.min_duration_months} mois` : "Non précisée"}</dd></div>
          <div><dt className="text-muted">Adresse</dt><dd className="font-semibold">Communiquée après le match</dd></div>
        </dl>
        {l.amenities.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">{l.amenities.map((a) => <span key={a} className="rounded-full bg-paper px-3 py-1.5 text-sm">{AMENITIES.find((x) => x.value === a)?.label ?? a}</span>)}</div>
        )}
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">{mine ? ownerPanel : seeker}</aside>
    </div>
  );
}
