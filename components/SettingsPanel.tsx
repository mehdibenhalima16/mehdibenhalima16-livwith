"use client";
import { useState, useTransition } from "react";
import { setPaused, deleteAccount } from "@/lib/actions/profile";
import { unblockUser } from "@/lib/actions/social";
import { Button, buttonClass } from "@/components/ui/Button";
import { Input, Notice } from "@/components/ui/Field";

export function PauseToggle({ paused }: { paused: boolean }) {
  const [p, setP] = useState(paused);
  const [pending, start] = useTransition();
  return (
    <Button variant={p ? "primary" : "secondary"} disabled={pending} onClick={() => start(async () => { const r = await setPaused(!p); if (!r.error) setP(!p); })}>
      {p ? "Réactiver mon profil" : "Mettre mon profil en pause"}
    </Button>
  );
}

export function BlockedList({ people }: { people: { id: string; name: string }[] }) {
  const [list, setList] = useState(people);
  const [pending, start] = useTransition();
  if (list.length === 0) return <p className="text-sm text-muted">Personne n&apos;est bloqué.</p>;
  return (
    <ul className="space-y-2">{list.map((p) => (
      <li key={p.id} className="flex items-center justify-between"><span>{p.name}</span>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { await unblockUser(p.id); setList(list.filter((x) => x.id !== p.id)); })}>Débloquer</Button>
      </li>
    ))}</ul>
  );
}

export function DeleteAccount() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Suppression définitive et immédiate : profil, photos, annonces, matchs et préférences. Tes messages restent visibles de leurs destinataires, sans ton nom.</p>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tape SUPPRIMER" aria-label="Confirmation" />
      {error && <Notice tone="error">{error}</Notice>}
      <Button variant="danger" disabled={pending || text.trim().toUpperCase() !== "SUPPRIMER"} onClick={() => start(async () => { const r = await deleteAccount(text); if (r?.error) setError(r.error); })}>
        Supprimer mon compte
      </Button>
    </div>
  );
}

export const exportLinkClass = buttonClass("secondary");
