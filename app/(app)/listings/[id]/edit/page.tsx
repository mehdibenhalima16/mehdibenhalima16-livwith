import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { LISTING_COLUMNS } from "@/lib/server/listings";
import { ListingForm } from "@/components/listings/ListingForm";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Listing } from "@/lib/types";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireProfile();
  const { data } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) notFound();
  const l = data as Listing;
  const urls = await signPaths("listing-photos", l.photos);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Modifier l'annonce" />
      <ListingForm userId={user.id} id={l.id} initialPhotos={l.photos.map((p) => ({ path: p, url: urls[p] }))} initial={{
        kind: l.kind, title: l.title, description: l.description, city: l.city, district: l.district ?? "", rent: l.rent, charges: l.charges,
        deposit: l.deposit, surface_m2: l.surface_m2, bedrooms: l.bedrooms, flatmates: l.flatmates, furnished: l.furnished,
        available_from: l.available_from, min_duration_months: l.min_duration_months, amenities: l.amenities,
      }} />
    </div>
  );
}
