import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const { user, profile } = await requireProfile();
  const urls = await signPaths("avatars", profile.photos);
  return (
    <div className="max-w-xl">
      <PageHeader title="Mon profil" action={<ButtonLink href="/profile/questionnaire" variant="secondary" size="sm">Mes critères de vie commune</ButtonLink>} />
      <ProfileEditor userId={user.id} photos={profile.photos.map((p) => ({ path: p, url: urls[p] }))} initial={{
        first_name: profile.first_name, gender: profile.gender, occupation: profile.occupation ?? "", bio: profile.bio, city: profile.city,
        budget_min: profile.budget_min, budget_max: profile.budget_max, move_in_date: profile.move_in_date, intents: profile.intents,
      }} />
    </div>
  );
}
