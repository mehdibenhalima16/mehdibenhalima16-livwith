import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, requireProfile } from "@/lib/server/auth";
import { LISTING_COLUMNS } from "@/lib/server/listings";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListingModeration, ReportModeration } from "@/components/admin/AdminButtons";
import { REPORT_REASONS } from "@/lib/config";
import { euros, relative } from "@/lib/format";
import type { Listing } from "@/lib/types";

export const metadata = { title: "Modération" };
export const dynamic = "force-dynamic";

type Report = { id: string; reason: string; details: string; created_at: string; target_user: string | null; target_listing: string | null; target_message: number | null };

export default async function AdminPage() {
  const { supabase } = await requireProfile();
  if (!(await isAdmin())) notFound();
  const [pending, reports] = await Promise.all([
    supabase.from("listings").select(LISTING_COLUMNS).eq("status", "pending_review").order("created_at").limit(50),
    supabase.from("reports").select("id, reason, details, created_at, target_user, target_listing, target_message").in("status", ["open", "reviewing"]).order("created_at").limit(100),
  ]);
  const reps = (reports.data ?? []) as Report[];
  const msgIds = reps.map((r) => r.target_message).filter((x): x is number => x != null);
  const { data: msgs } = msgIds.length ? await supabase.from("messages").select("id, body, sender_id").in("id", msgIds) : { data: [] };
  const listingOwner = new Map<string, string>();
  const lids = reps.map((r) => r.target_listing).filter((x): x is string => Boolean(x));
  if (lids.length) (await supabase.from("listings").select("id, owner_id").in("id", lids)).data?.forEach((l) => listingOwner.set(l.id, l.owner_id));

  return (
    <div className="space-y-8">
      <PageHeader title="Modération" lead="Annonces en vérification et signalements ouverts. Toutes les actions passent par des fonctions contrôlées en base." />
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Annonces en vérification ({pending.data?.length ?? 0})</h2>
        <ul className="space-y-2">
          {((pending.data ?? []) as Listing[]).map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
              <div><Link href={`/listings/${l.id}`} className="font-semibold hover:underline">{l.title}</Link>
                <p className="text-sm text-muted">{euros(l.total_monthly)} · {l.city} · {l.review_reason}</p></div>
              <ListingModeration id={l.id} />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Signalements ouverts ({reps.length})</h2>
        <ul className="space-y-2">
          {reps.map((r) => {
            const m = msgs?.find((x) => x.id === r.target_message);
            const userId = r.target_user ?? (r.target_listing ? listingOwner.get(r.target_listing) ?? null : m?.sender_id ?? null);
            return (
              <li key={r.id} className="space-y-2 rounded-2xl border border-line bg-paper p-4">
                <p className="text-sm"><strong>{REPORT_REASONS.find((x) => x.value === r.reason)?.label}</strong> · {relative(r.created_at)}</p>
                {r.target_user && <Link href={`/u/${r.target_user}`} className="text-sm text-door underline">Voir le profil</Link>}
                {r.target_listing && <Link href={`/listings/${r.target_listing}`} className="text-sm text-door underline">Voir l&apos;annonce</Link>}
                {m && <blockquote className="rounded-xl bg-plaster px-3 py-2 text-sm">{m.body}</blockquote>}
                {r.details && <p className="text-sm text-muted">« {r.details} »</p>}
                <ReportModeration id={r.id} userId={userId} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
