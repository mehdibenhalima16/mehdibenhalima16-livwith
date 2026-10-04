import Link from "next/link";
import { Users } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { CreateGroupForm, InviteResponse } from "@/components/groups/GroupWidgets";
import { cityName } from "@/lib/config";
import { euros } from "@/lib/format";

export const metadata = { title: "Groupes" };
export const dynamic = "force-dynamic";

type Row = { status: string; role: string; groups: { id: string; name: string; city: string; budget_per_person: number; target_size: number } | null };

export default async function GroupsPage() {
  const { user, profile, supabase } = await requireProfile();
  const { data } = await supabase.from("group_members")
    .select("status, role, groups(id, name, city, budget_per_person, target_size)").eq("user_id", user.id).in("status", ["active", "invited"]);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.groups);
  const active = rows.filter((r) => r.status === "active");
  const invited = rows.filter((r) => r.status === "invited");
  return (
    <>
      <PageHeader title="Groupes" lead="Pas encore de logement ? Forme un groupe avec tes matchs, puis cherchez un appartement entier ensemble." />
      {invited.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-bold">Invitations</h2>
          <ul className="space-y-2">
            {invited.map((r) => (
              <li key={r.groups!.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-blush-deep bg-blush/40 p-4">
                <span><strong>{r.groups!.name}</strong> · {cityName(r.groups!.city)}</span>
                <InviteResponse groupId={r.groups!.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Mes groupes</h2>
          {active.length === 0 ? <p className="text-muted">Aucun groupe pour l&apos;instant.</p> : (
            <ul className="space-y-2">
              {active.map((r) => (
                <li key={r.groups!.id}>
                  <Link href={`/groups/${r.groups!.id}`} className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-line bg-paper p-4 hover:border-door">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blush text-door-deep"><Users className="h-5 w-5" aria-hidden /></span>
                    <span className="flex-1">
                      <span className="block font-semibold">{r.groups!.name}</span>
                      <span className="text-sm text-muted">{cityName(r.groups!.city)} · {euros(r.groups!.budget_per_person)} par personne · {r.groups!.target_size} personnes visées</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 className="mb-4 font-display text-xl font-bold">Nouveau groupe</h2>
          <CreateGroupForm city={profile.city} budget={profile.budget_max} />
        </section>
      </div>
    </>
  );
}
