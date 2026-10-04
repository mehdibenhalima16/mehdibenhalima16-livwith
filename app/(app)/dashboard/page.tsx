import Link from "next/link";
import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { decorate, LISTING_COLUMNS } from "@/lib/server/listings";
import type { Listing } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { ListingCard } from "@/components/listings/ListingCard";
import { InviteResponse } from "@/components/groups/GroupWidgets";
import { Notice } from "@/components/ui/Field";
import { relative } from "@/lib/format";

export const metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export default async function Dashboard() {
  const { user, profile, supabase } = await requireProfile();
  const [mine, favs, matches, convs, invites, requests] = await Promise.all([
    supabase.from("listings").select(LISTING_COLUMNS).eq("owner_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
    supabase.from("favorites").select("listing_id").eq("user_id", user.id),
    supabase.from("matches").select("id, user_a, user_b, created_at").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("created_at", { ascending: false }).limit(12),
    supabase.rpc("my_conversations"),
    supabase.from("group_members").select("group_id, groups(name)").eq("user_id", user.id).eq("status", "invited"),
    supabase.from("swipes").select("swiper, listing_id").eq("target", user.id).eq("liked", true).not("listing_id", "is", null),
  ]);
  const favIds = (favs.data ?? []).map((f) => f.listing_id);
  const { data: favListings } = favIds.length ? await supabase.from("listings").select(LISTING_COLUMNS).in("id", favIds) : { data: [] };
  const [mineDecorated, favDecorated] = await Promise.all([
    decorate(user.id, supabase, (mine.data ?? []) as Listing[]),
    decorate(user.id, supabase, (favListings ?? []) as Listing[]),
  ]);
  const matchIds = (matches.data ?? []).map((m) => (m.user_a === user.id ? m.user_b : m.user_a));
  const { data: people } = matchIds.length ? await supabase.from("profiles").select("id, first_name, photos").in("id", matchIds) : { data: [] };
  const [avatars, myPhoto] = await Promise.all([
    signPaths("avatars", (people ?? []).map((p) => p.photos[0])),
    signPaths("avatars", [profile.photos[0]]),
  ]);
  const unread = ((convs.data ?? []) as { unread: number; conversation_id: string; title: string; last_message_at: string }[]).filter((c) => c.unread > 0);
  const { data: answered } = await supabase.from("swipes").select("target").eq("swiper", user.id);
  const pendingRequests = (requests.data ?? []).filter((r) => !(answered ?? []).some((a) => a.target === r.swiper)).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar src={myPhoto[profile.photos[0]]} name={profile.first_name} size={64} />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">Salut {profile.first_name}</h1>
          <p className="text-muted">{profile.is_paused ? "Ton profil est en pause." : "Ton profil est visible."} <Link href="/profile" className="font-semibold text-door hover:underline">Modifier</Link> · <Link href="/settings" className="font-semibold text-door hover:underline">Paramètres</Link></p>
        </div>
      </header>

      {(invites.data ?? []).length > 0 && (invites.data as unknown as { group_id: string; groups: { name: string } | null }[]).map((i) => (
        <Notice key={i.group_id} tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-3"><span>Invitation à rejoindre « {i.groups?.name} »</span><InviteResponse groupId={i.group_id} /></div>
        </Notice>
      ))}
      {pendingRequests > 0 && <Notice tone="success">{pendingRequests} demande{pendingRequests > 1 ? "s" : ""} en attente sur tes annonces. Ouvre une annonce pour répondre.</Notice>}

      <div className="grid gap-5 md:grid-cols-2">
        <Section title={`Matchs (${matchIds.length})`} action={<ButtonLink href="/discover" size="sm" variant="ghost">Découvrir</ButtonLink>}>
          {matchIds.length === 0 ? <p className="text-sm text-muted">Pas encore de match. Continue à découvrir des profils.</p> : (
            <ul className="flex flex-wrap gap-3">
              {(people ?? []).map((p) => (
                <li key={p.id}><Link href={`/u/${p.id}`} className="flex w-16 flex-col items-center gap-1 text-center text-xs font-semibold"><Avatar src={avatars[p.photos[0]]} name={p.first_name} size={56} />{p.first_name}</Link></li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Conversations" action={<ButtonLink href="/messages" size="sm" variant="ghost">Tout voir</ButtonLink>}>
          {unread.length === 0 ? <p className="text-sm text-muted">Aucun message non lu.</p> : (
            <ul className="space-y-1.5">{unread.slice(0, 5).map((c) => (
              <li key={c.conversation_id}><Link href={`/messages/${c.conversation_id}`} className="flex justify-between text-sm hover:underline"><strong>{c.title}</strong><span className="text-muted">{relative(c.last_message_at)}</span></Link></li>
            ))}</ul>
          )}
        </Section>
      </div>

      <Section title="Mes annonces" action={<ButtonLink href="/listings/new" size="sm"><Plus className="h-4 w-4" aria-hidden />Publier</ButtonLink>}>
        {mineDecorated.length === 0 ? <p className="text-sm text-muted">Tu as un logement ou une chambre à proposer ? Publie une annonce.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mineDecorated.map((x) => <ListingCard key={x.l.id} l={x.l} cover={x.cover} showStatus />)}</div>
        )}
      </Section>

      <Section title="Annonces enregistrées" action={<ButtonLink href="/listings" size="sm" variant="ghost">Parcourir</ButtonLink>}>
        {favDecorated.length === 0 ? <p className="text-sm text-muted">Enregistre des annonces pour les retrouver ici.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favDecorated.map((x) => <ListingCard key={x.l.id} l={x.l} cover={x.cover} compat={x.compat} />)}</div>
        )}
      </Section>
    </div>
  );
}
