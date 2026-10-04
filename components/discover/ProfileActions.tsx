"use client";
import { useState, useTransition } from "react";
import { Handshake, X } from "lucide-react";
import { swipeAction } from "@/lib/actions/social";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Field";

export function ProfileActions({ target, name, conversationId, liked }: { target: string; name: string; conversationId: string | null; liked: boolean }) {
  const [conv, setConv] = useState(conversationId);
  const [sent, setSent] = useState(liked);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (conv) return <ButtonLink href={`/messages/${conv}`} className="w-full">Écrire à {name}</ButtonLink>;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => { await swipeAction(target, false); setMsg("Profil passé."); setSent(false); })} aria-label="Passer"><X className="h-5 w-5" /></Button>
        <Button className="flex-1" disabled={pending || sent} onClick={() => start(async () => {
          const r = await swipeAction(target, true);
          if (r.error) return setMsg(r.error);
          setSent(true);
          if (r.conversationId) setConv(r.conversationId); else setMsg(`Si ${name} te choisit aussi, une conversation s'ouvrira.`);
        })}><Handshake className="h-5 w-5" aria-hidden />{sent ? "Proposition envoyée" : "On se parle ?"}</Button>
      </div>
      {msg && <Notice>{msg}</Notice>}
    </div>
  );
}
