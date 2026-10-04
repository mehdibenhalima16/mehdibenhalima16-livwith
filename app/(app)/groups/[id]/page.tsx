import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { loadInputs } from "@/lib/server/compat";
import { decorate, LISTING_COLUMNS } from "@/lib/server/listings";
import { groupCompatibility } from "@/lib/matching";
import { cityName } from "@/lib/config";
import { euros, longDate } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { ListingCard } from "@/components/listings/ListingCard";
import { InvitePicker, LeaveGroupButton } from "@/components/groups/GroupWidgets";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user, supabase } = await requireProfile();
  const { data: g } = await supabase.from("groups").select("id, name, city, budget_per_person, target_size, move_in_date, description").eq("id", id).maybeSingle();
  if (!g) notFound();
  const { data: members } = await supabase.from("group_members").select("user_id, role, status").eq("group_id", id).in("status", ["active", "invited"]);
  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: people } = await supabase.from("profiles").select("id, first_name, photos").in("id", memberIds);
  const [avatars, conv, shortlist, matches] = await Promise.all([
    signPaths("avatars", (people ?? []).map((p) => p.photos[0])),
    supabase.from("conversations").select("id").eq("group_id", id).maybeSingle(),
    supabase.from("group_listings").select("listing_id").eq("group_id", id),
    supabase.from("matches").select("user_a, user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
  ]);
  const activeIds = (members ?? []).filter((m) => m.status === "active").map((m) => m.user_id);
  const inputs = await loadInputs(activeIds);
  const gc = groupCompatibility(activeIds.filter((m) => inputs.has(m)).map((m) => ({ id: m, input: inputs.get(m)! })));
  const nameOf = (uid: string) => people?.find((p) => p.id === uid)?.first_name ?? "Membre";

  const listingIds = (shortlist.data ?? []).map((s) => s.listing_id);
  const { data: listings } = listingIds.length ? await supabase.from("listings").select(LISTING_COLUMNS).in("id", listingIds) : { data: [] };
  const items = await decorate(user.id, supabase, (listings ?? []) as Listing[]);

  const matchIds = (matches.data ?? []).map((m) => (m.user_a === user.id ? m.user_b : m.user_a)).filter((m) => !memberIds.includes(m));
  const { data: candidates } = matchIds.length ? await supabase.from("profiles").select("id, first_name, photos").in("id", matchIds) : { data: [] };
  const candAvatars = await signPaths("avatars", (candidates ?? []).map((c) => c.photos[0]));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">{g.name}</h1>
          <p className="mt-1 text-muted">{cityName(g.city)} · {euros(g.budget_per_person)} par personne · {g.target_size} personnes visées{g.move_in_date ? ` · dès le ${longDate(g.move_in_date)}` : ""}</p>
          {g.description && <p className="mt-2 max-w-xl">{g.description}</p>}
        </div>
        {conv.data && <ButtonLink href={`/messages/${conv.data.id}`}><MessageCircle className="h-5 w-5" aria-hidden />Chat du groupe</ButtonLink>}
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
          <h2 className="mb-3 font-display text-xl font-bold">Membres</h2>
          <ul className="space-y-2.5">
            {(members ?? []).map((m) => {
              const p = people?.find((x) => x.id === m.user_id);
              return (
                <li key={m.user_id} className="flex items-center gap-3">
                  <Avatar src={p ? avatars[p.photos[0]] : null} name={p?.first_name ?? "?"} size={40} />
                  <Link href={m.user_id === user.id ? "/profile" : `/u/${m.user_id}`} className="flex-1 font-semibold hover:underline">{p?.first_name ?? "Membre"}{m.user_id === user.id ? " (toi)" : ""}</Link>
                  <span className="text-xs text-muted">{m.status === "invited" ? "Invité·e" : m.role === "owner" ? "Créateur·rice" : "Membre"}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
          <h2 className="mb-1 font-display text-xl font-bold">Compatibilité du groupe</h2>
          {gc ? (
            <>
              <p className="font-display text-4xl font-bold text-door">{gc.average} %</p>
              <p className="text-sm text-muted">Moyenne des {gc.pairs.length} paire{gc.pairs.length > 1 ? "s" : ""}.</p>
              <p className="mt-3 text-sm">Paire la plus fragile : <strong>{nameOf(gc.weakest.a)} et {nameOf(gc.weakest.b)}</strong>, {gc.weakest.score ?? 0} %. Parlez-en tôt.</p>
            </>
          ) : <p className="text-sm text-muted">Le score apparaît dès que deux membres ont rejoint le groupe.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Sélection d&apos;annonces</h2>
        {items.length === 0 ? <p className="text-muted">Proposez des annonces au groupe depuis leur page (« Proposer au groupe »).</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((x) => <ListingCard key={x.l.id} l={x.l} cover={x.cover} compat={x.compat} />)}</div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
          <h2 className="mb-3 font-display text-xl font-bold">Inviter un de tes matchs</h2>
          <InvitePicker groupId={id} candidates={(candidates ?? []).map((c) => ({ id: c.id, name: c.first_name, photo: candAvatars[c.photos[0]] }))} />
        </div>
        <div className="flex items-end justify-end"><LeaveGroupButton groupId={id} /></div>
      </section>
    </div>
  );
}
