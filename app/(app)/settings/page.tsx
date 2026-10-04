import Link from "next/link";
import { requireProfile } from "@/lib/server/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { BlockedList, DeleteAccount, exportLinkClass, PauseToggle } from "@/components/SettingsPanel";

export const metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-[var(--radius-panel)] border border-line bg-paper p-5"><h2 className="font-display text-xl font-bold">{title}</h2>{children}</section>;
}

export default async function SettingsPage() {
  const { user, profile, supabase } = await requireProfile();
  const { data: blocks } = await supabase.from("blocks").select("blocked").eq("blocker", user.id);
  const ids = (blocks ?? []).map((b) => b.blocked);
  // Les profils bloqués ne sont plus lisibles via la RLS : on affiche un libellé neutre.
  const people = ids.map((id, i) => ({ id, name: `Personne bloquée n° ${i + 1}` }));
  return (
    <div className="max-w-xl space-y-5">
      <PageHeader title="Paramètres" lead={user.email} />
      <Block title="Visibilité">
        <p className="text-sm text-muted">En pause, tu n&apos;apparais plus dans la découverte. Tes matchs et conversations restent actifs.</p>
        <PauseToggle paused={profile.is_paused} />
      </Block>
      <Block title="Personnes bloquées"><BlockedList people={people} /></Block>
      <Block title="Mes données">
        <p className="text-sm text-muted">Télécharge une copie de tes données (profil, préférences, annonces, messages envoyés) au format JSON.</p>
        <a href="/api/me/export" className={exportLinkClass}>Exporter mes données</a>
      </Block>
      <Block title="Compte">
        <form action="/auth/signout" method="post"><button className="font-semibold text-door hover:underline">Se déconnecter</button></form>
        <p className="text-sm"><Link href="/legal/privacy" className="text-door underline">Politique de confidentialité</Link> · <Link href="/legal/terms" className="text-door underline">Conditions d&apos;utilisation</Link></p>
      </Block>
      <Block title="Supprimer mon compte"><DeleteAccount /></Block>
    </div>
  );
}
