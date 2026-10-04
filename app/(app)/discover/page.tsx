import { SwipeDeck } from "@/components/discover/SwipeDeck";
import { requireProfile } from "@/lib/server/auth";
import { buildDeck } from "@/lib/server/discovery";
import { Notice } from "@/components/ui/Field";
import Link from "next/link";

export const metadata = { title: "Découvrir" };
export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const { user, profile } = await requireProfile();
  const deck = await buildDeck(user.id);
  return (
    <div>
      {profile.is_paused && (
        <div className="mx-auto mb-4 max-w-md">
          <Notice tone="warning">Ton profil est en pause : personne ne te voit. <Link href="/settings" className="font-semibold underline">Le réactiver</Link></Notice>
        </div>
      )}
      <SwipeDeck initial={deck} myName={profile.first_name} />
    </div>
  );
}
