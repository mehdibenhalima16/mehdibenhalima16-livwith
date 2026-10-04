import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/server/auth";
import { QuestionnaireEditor } from "@/components/profile/ProfileEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Preferences } from "@/lib/lifestyle";

export const metadata = { title: "Mes critères" };

export default async function QuestionnairePage() {
  const { user, profile, supabase } = await requireProfile();
  const { data } = await supabase.from("profiles_private").select("preferences, age_min, age_max, household_pref").eq("id", user.id).maybeSingle();
  if (!data) redirect("/onboarding");
  return (
    <div className="max-w-xl">
      <PageHeader title="Mes critères de vie commune" lead="Tes réponses sont visibles par les autres membres ; ce que tu acceptes et l'importance que tu y accordes restent privés." />
      <QuestionnaireEditor lifestyle={profile.lifestyle} preferences={data.preferences as Preferences}
        extra={{ age_min: data.age_min, age_max: data.age_max, household_pref: data.household_pref }} />
    </div>
  );
}
