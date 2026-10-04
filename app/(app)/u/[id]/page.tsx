import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { compatWith } from "@/lib/server/compat";
import { conversationWith } from "@/lib/server/relations";
import { PROFILE_COLUMNS, type DeckCard, type Profile } from "@/lib/types";
import { ProfileCard } from "@/components/discover/ProfileCard";
import { ProfileActions } from "@/components/discover/ProfileActions";
import { BlockButton, ReportButton } from "@/components/safety/SafetyActions";
import { Notice } from "@/components/ui/Field";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user, supabase } = await requireProfile();
  if (id === user.id) redirect("/profile");
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle();
  if (!data?.onboarded_at) notFound();
  const p = data as Profile;
  const [urls, compat, conv, swipe] = await Promise.all([
    signPaths("avatars", p.photos),
    compatWith(user.id, [p.id]),
    conversationWith(supabase, user.id, p.id),
    supabase.from("swipes").select("liked").eq("swiper", user.id).eq("target", p.id).maybeSingle(),
  ]);
  const c = compat.get(p.id);
  const card: DeckCard | null = c ? {
    id: p.id, firstName: p.first_name, age: p.age_years ?? null, occupation: p.occupation, bio: p.bio, city: p.city,
    budgetMin: p.budget_min, budgetMax: p.budget_max, moveInDate: p.move_in_date, intents: p.intents,
    photos: p.photos.map((x) => urls[x]).filter(Boolean), isDemo: p.is_demo, lifestyle: p.lifestyle, compat: c,
  } : null;

  return (
    <div className="mx-auto max-w-md space-y-4">
      {card ? <ProfileCard card={card} expanded /> : (
        <Notice tone="warning">{p.first_name} ne correspond pas à l&apos;un de vos critères « impératifs ». Le détail n&apos;est pas affiché.</Notice>
      )}
      {card && <ProfileActions target={p.id} name={p.first_name} conversationId={conv} liked={Boolean(swipe.data?.liked)} />}
      <div className="flex justify-center gap-6 pt-2">
        <ReportButton kind="user" id={p.id} />
        <BlockButton userId={p.id} name={p.first_name} />
      </div>
    </div>
  );
}
