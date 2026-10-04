"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Flag } from "lucide-react";
import { REPORT_REASONS } from "@/lib/config";
import { blockUser, reportContent } from "@/lib/actions/social";
import { Button } from "@/components/ui/Button";
import { Notice, Select, Textarea } from "@/components/ui/Field";

export function ReportButton({ kind, id, label = "Signaler", compact = false }: { kind: "user" | "listing" | "message"; id: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("fake");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-alert ${compact ? "text-xs" : ""}`}>
        <Flag className="h-4 w-4" aria-hidden />{label}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[var(--radius-card)] bg-paper p-6">
            <h2 id="report-title" className="font-display text-2xl font-bold">Signaler</h2>
            {done ? (
              <div className="mt-4 space-y-4"><Notice tone="success">{done}</Notice><Button className="w-full" onClick={() => setOpen(false)}>Fermer</Button></div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted">Ton signalement est confidentiel. La personne n&apos;est pas prévenue.</p>
                <Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Motif">
                  {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
                <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Ce qui s'est passé (facultatif)" aria-label="Détails" />
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button variant="danger" className="flex-1" disabled={pending} onClick={() => start(async () => {
                    const r = await reportContent({ kind, id, reason, details });
                    if (r.error) setError(r.error); else setDone("Merci. La modération va examiner ce signalement. Tu peux aussi bloquer la personne.");
                  })}>Envoyer</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function BlockButton({ userId, name, redirectTo = "/discover" }: { userId: string; name: string; redirectTo?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-alert"
      onClick={() => {
        if (!window.confirm(`Bloquer ${name} ? Vous ne vous verrez plus et votre conversation sera fermée.`)) return;
        start(async () => { const r = await blockUser(userId); if (!r.error) router.push(redirectTo); });
      }}>
      <Ban className="h-4 w-4" aria-hidden />Bloquer
    </button>
  );
}
