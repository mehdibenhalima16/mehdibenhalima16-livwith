import { requireProfile } from "@/lib/server/auth";
import { ListingForm } from "@/components/listings/ListingForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Publier une annonce" };

export default async function NewListingPage() {
  const { user, profile } = await requireProfile();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Publier une annonce" lead="Les personnes intéressées t'envoient une demande ; tu choisis avec qui parler." />
      <ListingForm userId={user.id} id={null} initialPhotos={[]} initial={{
        kind: "room", title: "", description: "", city: profile.city, district: "", rent: profile.budget_max, charges: 0, deposit: null,
        surface_m2: null, bedrooms: null, flatmates: null, furnished: true, available_from: profile.move_in_date, min_duration_months: null, amenities: [],
      }} />
    </div>
  );
}
