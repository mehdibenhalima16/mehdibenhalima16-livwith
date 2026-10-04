import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { ChatRoom, type ChatMessage } from "@/components/chat/ChatRoom";
import { Avatar } from "@/components/ui/Avatar";
import { BlockButton, ReportButton } from "@/components/safety/SafetyActions";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireProfile();
  const { data: conv } = await supabase.from("conversations").select("id, kind, group_id, closed_at").eq("id", id).maybeSingle();
  if (!conv) notFound();

  const [{ data: parts }, { data: msgs }] = await Promise.all([
    supabase.from("conversation_participants").select("user_id, last_read_at").eq("conversation_id", id),
    supabase.from("messages").select("id, sender_id, body, flagged, created_at").eq("conversation_id", id).order("id", { ascending: false }).limit(200),
  ]);
  const others = (parts ?? []).filter((p) => p.user_id !== user.id);
  const { data: people } = others.length
    ? await supabase.from("profiles").select("id, first_name, photos").in("id", others.map((o) => o.user_id))
    : { data: [] as { id: string; first_name: string; photos: string[] }[] };
  const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.first_name]));
  let title = people?.[0]?.first_name ?? "Compte supprimé";
  if (conv.kind === "group" && conv.group_id) {
    const { data: g } = await supabase.from("groups").select("name").eq("id", conv.group_id).maybeSingle();
    title = g?.name ?? "Groupe";
  }
  const other = conv.kind === "direct" ? people?.[0] : undefined;
  const urls = other ? await signPaths("avatars", [other.photos[0]]) : {};

  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center gap-3 border-b border-line pb-3">
        <Link href="/messages" aria-label="Retour aux messages" className="rounded-full p-2 hover:bg-paper"><ArrowLeft className="h-5 w-5" /></Link>
        {other ? (
          <Link href={`/u/${other.id}`} className="flex items-center gap-3">
            <Avatar src={urls[other.photos[0]]} name={other.first_name} size={40} />
            <span className="font-display text-xl font-bold">{title}</span>
          </Link>
        ) : (
          <Link href={conv.group_id ? `/groups/${conv.group_id}` : "#"} className="font-display text-xl font-bold">{title}</Link>
        )}
        <div className="ml-auto flex items-center gap-4">
          {other && <ReportButton kind="user" id={other.id} compact />}
          {other && <BlockButton userId={other.id} name={other.first_name} redirectTo="/messages" />}
        </div>
      </header>
      <p className="mt-3 flex items-start gap-2 rounded-2xl bg-door/6 px-4 py-2.5 text-xs text-door-deep">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Visite toujours avant de payer. Aucun loyer, caution ou frais de réservation avant la signature du bail.
      </p>
      <ChatRoom conversationId={id} me={user.id} initial={((msgs ?? []) as ChatMessage[]).reverse()} names={names}
        closed={Boolean(conv.closed_at)} otherLastRead={conv.kind === "direct" ? others[0]?.last_read_at ?? null : null} />
    </div>
  );
}
