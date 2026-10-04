"use client";
import { useTransition } from "react";
import { moderateListing, resolveReport, suspendUser } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function ListingModeration({ id }: { id: string }) {
  const [p, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={p} onClick={() => start(async () => { await moderateListing(id, "published"); })}>Approuver</Button>
      <Button size="sm" variant="danger" disabled={p} onClick={() => start(async () => { await moderateListing(id, "removed", "Retirée par la modération"); })}>Retirer</Button>
    </div>
  );
}

export function ReportModeration({ id, userId }: { id: string; userId: string | null }) {
  const [p, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={p} onClick={() => start(async () => { await resolveReport(id, "dismissed"); })}>Classer</Button>
      <Button size="sm" disabled={p} onClick={() => start(async () => { await resolveReport(id, "actioned"); })}>Traité</Button>
      {userId && <Button size="sm" variant="danger" disabled={p} onClick={() => start(async () => {
        if (window.confirm("Suspendre ce compte ?")) { await suspendUser(userId, true); await resolveReport(id, "actioned"); }
      })}>Suspendre le compte</Button>}
    </div>
  );
}
