/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BedDouble, Building2 } from "lucide-react";
import { cityName } from "@/lib/config";
import { euros, moveInLabel } from "@/lib/format";
import { CompatBadge } from "@/components/compat/CompatMeter";
import type { Listing } from "@/lib/types";

export const STATUS_LABEL: Record<Listing["status"], string> = {
  draft: "Brouillon", pending_review: "En vérification", published: "Publiée", filled: "Pourvue", archived: "Archivée", removed: "Retirée",
};

export function ListingCard({ l, cover, compat, ownerName, showStatus = false }: {
  l: Listing; cover?: string; compat?: number | null; ownerName?: string; showStatus?: boolean;
}) {
  return (
    <Link href={`/listings/${l.id}`} className="group block overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper hover:border-door">
      <div className="relative aspect-[4/3] bg-plaster">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted"><Building2 className="h-10 w-10" aria-hidden /></div>}
        <span className="absolute left-3 top-3 rounded-full bg-paper/95 px-2.5 py-1 text-xs font-bold">{l.kind === "room" ? "Chambre" : "Logement entier"}</span>
        {showStatus && <span className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">{STATUS_LABEL[l.status]}</span>}
        {l.status === "filled" && !showStatus && <span className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">Pourvue</span>}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-snug">{l.title}</h3>
          <p className="shrink-0 font-display text-lg font-bold">{euros(l.total_monthly)}</p>
        </div>
        <p className="text-sm text-muted">{[l.district, cityName(l.city)].filter(Boolean).join(", ")} · {moveInLabel(l.available_from)}</p>
        <div className="flex items-center justify-between pt-1 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <BedDouble className="h-4 w-4" aria-hidden />
            {l.surface_m2 ? `${l.surface_m2} m²` : l.kind === "room" ? "Chambre" : "Logement"}
            {l.flatmates != null && l.kind === "room" ? ` · ${l.flatmates} coloc${l.flatmates > 1 ? "s" : ""}` : ""}
          </span>
          {compat != null && <CompatBadge score={compat} size="sm" />}
          {compat == null && ownerName && <span className="text-xs text-muted">par {ownerName}</span>}
        </div>
      </div>
    </Link>
  );
}
