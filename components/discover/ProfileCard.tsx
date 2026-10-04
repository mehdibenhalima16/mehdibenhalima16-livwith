/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import { Calendar, MapPin, Wallet } from "lucide-react";
import type { DeckCard } from "@/lib/types";
import { cityName, INTENTS } from "@/lib/config";
import { euros, moveInLabel } from "@/lib/format";
import { DEF, type Dim } from "@/lib/lifestyle";
import { CompatBadge, CompatExplainer } from "@/components/compat/CompatMeter";
import { Avatar, DemoBadge } from "@/components/ui/Avatar";

export function ProfileCard({ card, expanded = false }: { card: DeckCard; expanded?: boolean }) {
  const [photo, setPhoto] = useState(0);
  const [open, setOpen] = useState(expanded);
  const photos = card.photos;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
      <div className="relative aspect-[4/5] max-h-[58vh] w-full shrink-0 bg-plaster">
        {photos.length > 0 ? (
          <img src={photos[photo]} alt={`Photo de ${card.firstName}`} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center"><Avatar name={card.firstName} size={120} /></div>
        )}
        {photos.length > 1 && (
          <>
            <div className="absolute inset-x-3 top-3 flex gap-1">
              {photos.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i === photo ? "bg-white" : "bg-white/40"}`} />)}
            </div>
            <button type="button" aria-label="Photo précédente" className="absolute inset-y-0 left-0 w-1/3" onClick={() => setPhoto((p) => Math.max(0, p - 1))} />
            <button type="button" aria-label="Photo suivante" className="absolute inset-y-0 right-0 w-1/3" onClick={() => setPhoto((p) => Math.min(photos.length - 1, p + 1))} />
          </>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <CompatBadge score={card.compat.score} />
          {card.isDemo && <DemoBadge />}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {card.firstName}{card.age ? <span className="font-medium text-muted">, {card.age} ans</span> : null}
          </h2>
          {card.occupation && <p className="text-sm text-muted">{card.occupation}</p>}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
          <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-door" aria-hidden />{cityName(card.city)}</li>
          <li className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-door" aria-hidden />{euros(card.budgetMin)} à {euros(card.budgetMax)}</li>
          <li className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-door" aria-hidden />{moveInLabel(card.moveInDate)}</li>
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {card.intents.map((i) => (
            <span key={i} className="rounded-full bg-blush px-2.5 py-1 text-xs font-semibold text-door-deep">{INTENTS.find((x) => x.value === i)?.short}</span>
          ))}
        </div>
        {card.bio && <p className="whitespace-pre-line text-[15px] leading-relaxed">{card.bio}</p>}
        {card.compat.highlights.length > 0 && (
          <p className="text-sm text-muted">
            Dans tes attentes : {card.compat.highlights.map((h) => DEF[h as Dim].label.toLowerCase()).join(", ")}
            {card.compat.frictions.length > 0 && <> · hors de tes attentes : {card.compat.frictions.slice(0, 2).map((h) => DEF[h as Dim].label.toLowerCase()).join(", ")}</>}
          </p>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-semibold text-door underline-offset-2 hover:underline" aria-expanded={open}>
          {open ? "Masquer le détail" : "Pourquoi ce score ?"}
        </button>
        {open && <CompatExplainer c={card.compat} name={card.firstName} />}
      </div>
    </article>
  );
}
