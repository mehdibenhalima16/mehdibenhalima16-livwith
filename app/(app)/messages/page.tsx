import Link from "next/link";
import { Users } from "lucide-react";
import { requireProfile } from "@/lib/server/auth";
import { signPaths } from "@/lib/server/photos";
import { Avatar, DemoBadge } from "@/components/ui/Avatar";
import { EmptyState, PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { relative } from "@/lib/format";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

interface Conv {
  conversation_id: string; kind: "direct" | "group"; title: string; other_photo: string | null; other_is_demo: boolean;
  last_message: string | null; last_message_at: string; last_sender: string | null; unread: number; closed: boolean;
}

export default async function MessagesPage() {
  const { user, supabase } = await requireProfile();
  const { data } = await supabase.rpc("my_conversations");
  const convs = (data ?? []) as Conv[];
  const urls = await signPaths("avatars", convs.map((c) => c.other_photo));
  return (
    <>
      <PageHeader title="Messages" lead="Seules les personnes avec qui tu as matché peuvent t'écrire." />
      {convs.length === 0 ? (
        <EmptyState title="Pas encore de conversation" action={<ButtonLink href="/discover">Découvrir des profils</ButtonLink>}>
          Quand vous vous choisissez tous les deux, une conversation s&apos;ouvre ici.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {convs.map((c) => (
            <li key={c.conversation_id}>
              <Link href={`/messages/${c.conversation_id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-plaster">
                {c.kind === "group"
                  ? <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-door-deep"><Users className="h-6 w-6" aria-hidden /></span>
                  : <Avatar src={c.other_photo ? urls[c.other_photo] : null} name={c.title} />}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">{c.title}{c.other_is_demo && <DemoBadge />}{c.closed && <span className="text-xs font-normal text-muted">fermée</span>}</p>
                  <p className={`truncate text-sm ${c.unread ? "font-semibold text-ink" : "text-muted"}`}>
                    {c.last_message ? `${c.last_sender === user.id ? "Toi : " : ""}${c.last_message}` : "Nouveau match : dis bonjour"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted">{relative(c.last_message_at)}</span>
                  {c.unread > 0 && <span className="rounded-full bg-door px-2 text-xs font-bold text-white">{c.unread}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
