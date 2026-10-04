"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Handshake } from "lucide-react";
import { deleteListing, setListingStatus, shortlistForGroup, toggleFavorite } from "@/lib/actions/listings";
import { swipeAction } from "@/lib/actions/social";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";

export function SeekerActions({ listingId, ownerId, ownerName, favorite, requested, conversationId, groups }: {
  listingId: string; ownerId: string; ownerName: string; favorite: boolean; requested: boolean; conversationId: string | null;
  groups: { id: string; name: string; shortlisted: boolean }[];
}) {
  const [fav, setFav] = useState(favorite);
  const [sent, setSent] = useState(requested);
  const [conv, setConv] = useState(conversationId);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-3">
      {conv ? (
        <ButtonLink href={`/messages/${conv}`} className="w-full">Écrire à {ownerName}</ButtonLink>
      ) : (
        <Button className="w-full" disabled={pending || sent} onClick={() => start(async () => {
          const r = await swipeAction(ownerId, true, listingId);
          if (r.error) return setMsg({ tone: "error", text: r.error });
          setSent(true);
          if (r.matched && r.conversationId) { setConv(r.conversationId); setMsg({ tone: "success", text: `C'est un match avec ${ownerName} !` }); }
          else setMsg({ tone: "success", text: `Demande envoyée. Si ${ownerName} accepte, une conversation s'ouvre.` });
        })}>
          <Handshake className="h-5 w-5" aria-hidden />{sent ? "Demande envoyée" : "Je suis intéressé·e"}
        </Button>
      )}
      <Button variant="secondary" className="w-full" disabled={pending} onClick={() => start(async () => {
        const r = await toggleFavorite(listingId, !fav); if (!r.error) setFav(!fav);
      })}>
        {fav ? <BookmarkCheck className="h-5 w-5" aria-hidden /> : <Bookmark className="h-5 w-5" aria-hidden />}{fav ? "Enregistrée" : "Enregistrer"}
      </Button>
      {groups.map((g) => (
        <Button key={g.id} variant="ghost" size="sm" className="w-full" disabled={pending} onClick={() => start(async () => {
          await shortlistForGroup(g.id, listingId, !g.shortlisted); router.refresh();
        })}>{g.shortlisted ? `Retirer de la sélection « ${g.name} »` : `Proposer au groupe « ${g.name} »`}</Button>
      ))}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}

export function OwnerActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const act = (s: "published" | "filled" | "archived" | "draft") => start(async () => {
    const r = await setListingStatus(id, s); if (r.error) setError(r.error); else router.refresh();
  });
  return (
    <div className="space-y-2">
      <ButtonLink href={`/listings/${id}/edit`} variant="secondary" className="w-full">Modifier</ButtonLink>
      {(status === "draft" || status === "archived") && <Button className="w-full" disabled={pending} onClick={() => act("published")}>Publier</Button>}
      {status === "published" && <Button className="w-full" disabled={pending} onClick={() => act("filled")}>Marquer comme pourvue</Button>}
      {status !== "archived" && status !== "removed" && <Button variant="ghost" className="w-full" disabled={pending} onClick={() => act("archived")}>Archiver</Button>}
      <Button variant="danger" className="w-full" disabled={pending} onClick={() => {
        if (window.confirm("Supprimer définitivement l'annonce et ses photos ?")) start(async () => { await deleteListing(id); });
      }}>Supprimer</Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}

export function RequestResponse({ seekerId, listingId, name }: { seekerId: string; listingId: string; name: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<null | "declined" | string>(null);
  if (state === "declined") return <span className="text-sm text-muted">Déclinée</span>;
  if (state) return <ButtonLink href={`/messages/${state}`} size="sm">Écrire à {name}</ButtonLink>;
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await swipeAction(seekerId, false, listingId); if (!r.error) setState("declined"); })}>Décliner</Button>
      <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await swipeAction(seekerId, true, listingId); if (r.conversationId) setState(r.conversationId); })}>Accepter</Button>
    </div>
  );
}
