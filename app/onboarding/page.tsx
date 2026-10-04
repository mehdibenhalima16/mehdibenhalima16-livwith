import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { OnboardingWizard } from "@/components/profile/OnboardingWizard";
import { getMyProfile, requireUser } from "@/lib/server/auth";

export const metadata = { title: "Crée ton profil" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getMyProfile();
  if (profile?.onboarded_at) redirect("/discover");
  return (
    <div className="min-h-dvh px-5 pb-16">
      <header className="py-5"><Logo href="/" /></header>
      <OnboardingWizard userId={user.id} />
    </div>
  );
}
