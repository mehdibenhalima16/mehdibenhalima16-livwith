"use client";
import { useActionState, useState, useTransition } from "react";
import { createGroup, inviteToGroup, leaveGroup, respondInvite } from "@/lib/actions/groups";
import { Button } from "@/components/ui/Button";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui/Field";
import { CITIES } from "@/lib/config";
import { Avatar } from "@/components/ui/Avatar";

export function CreateGroupForm({ city, budget }: { city: string; budget: number }) {
  const [state, action, pending] = useActionState(createGroup, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Nom du groupe" htmlFor="gname"><Input id="gname" name="name" required maxLength={50} placeholder="La bande du 11e" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville" htmlFor="gcity"><Select id="gcity" name="city" defaultValue={city}>{CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
        <Field label="Budget / personne (€)" htmlFor="gbudget"><Input id="gbudget" name="budget" type="number" min={100} max={5000} defaultValue={budget} required /></Field>
        <Field label="Taille visée" htmlFor="gsize"><Select id="gsize" name="target_size" defaultValue="3">{[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} personnes</option>)}</Select></Field>
        <Field label="Emménagement" htmlFor="gmove"><Input id="gmove" name="move_in" type="date" /></Field>
      </div>
      <Field label="Ce que vous cherchez" htmlFor="gdesc"><Textarea id="gdesc" name="description" maxLength={500} placeholder="Un T4 près d'une ligne de métro, avec un vrai salon." /></Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">Créer le groupe</Button>
    </form>
  );
}

export function InviteResponse({ groupId }: { groupId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { await respondInvite(groupId, false); })}>Décliner</Button>
      <Button size="sm" disabled={pending} onClick={() => start(async () => { await respondInvite(groupId, true); })}>Rejoindre</Button>
    </div>
  );
}

export function InvitePicker({ groupId, candidates }: { groupId: string; candidates: { id: string; name: string; photo?: string }[] }) {
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (candidates.length === 0) return <p className="text-sm text-muted">Tous tes matchs sont déjà dans le groupe, ou tu n&apos;as pas encore de match.</p>;
  return (
    <ul className="space-y-2">
      {candidates.map((c) => (
        <li key={c.id} className="flex items-center gap-3">
          <Avatar src={c.photo} name={c.name} size={36} />
          <span className="flex-1 font-semibold">{c.name}</span>
          <Button size="sm" variant="secondary" disabled={pending || done.includes(c.id)} onClick={() => start(async () => {
            const r = await inviteToGroup(groupId, c.id); if (r.error) setError(r.error); else setDone([...done, c.id]);
          })}>{done.includes(c.id) ? "Invité·e" : "Inviter"}</Button>
        </li>
      ))}
      {error && <Notice tone="error">{error}</Notice>}
    </ul>
  );
}

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [pending, start] = useTransition();
  return <Button variant="danger" size="sm" disabled={pending} onClick={() => { if (window.confirm("Quitter ce groupe ?")) start(async () => { await leaveGroup(groupId); }); }}>Quitter le groupe</Button>;
}
