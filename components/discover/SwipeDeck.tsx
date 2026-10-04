"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Handshake, X } from "lucide-react";
import type { DeckCard } from "@/lib/types";
import { loadMoreCards, swipeAction } from "@/lib/actions/social";
import { ProfileCard } from "./ProfileCard";
import { MatchOverlay } from "./MatchOverlay";
import { Notice } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { performSwipe, removeCard, restoreCard, type DeckState } from "@/lib/swipe-flow";

const THRESHOLD = 110;

export function SwipeDeck({ initial, myName }: { initial: DeckCard[]; myName: string }) {
  const [deck, setDeck] = useState<DeckState>({ cards: initial, seen: [] });
  const { cards, seen } = deck;
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<null | "left" | "right">(null);
  const [match, setMatch] = useState<{ name: string; conversationId?: string } | null>(null);
  const [failed, setFailed] = useState<{ cardId: string; liked: boolean; message: string } | null>(null);
  const [exhausted, setExhausted] = useState(initial.length === 0);
  const busy = useRef(false);
  const start = useRef<number | null>(null);
  const current = cards[0];

  const decide = useCallback(async (liked: boolean) => {
    if (!current || busy.current) return;
    busy.current = true;
    const card = current;
    setLeaving(liked ? "right" : "left");
    setFailed(null);
    const r = await performSwipe({
      send: () => swipeAction(card.id, liked),
      animate: () => new Promise((resolve) => window.setTimeout(resolve, 220)),
      onRemoved: () => { setDeck((d) => removeCard(d, card.id)); setDx(0); setLeaving(null); },
    });
    busy.current = false;
    if (r.error) {
      // Le choix n'a pas été enregistré : la carte revient en tête.
      setDeck((d) => restoreCard(d, card));
      setFailed({ cardId: card.id, liked, message: r.error });
    } else if (r.matched) {
      setMatch({ name: card.firstName, conversationId: r.conversationId });
    }
  }, [current]);

  // Recharge quand il reste peu de cartes.
  useEffect(() => {
    if (cards.length > 3 || exhausted) return;
    let cancelled = false;
    loadMoreCards([...seen, ...cards.map((c) => c.id)]).catch(() => [] as DeckCard[]).then((more) => {
      if (cancelled) return;
      const fresh = more.filter((m) => !cards.some((c) => c.id === m.id) && !seen.includes(m.id));
      if (fresh.length === 0) setExhausted(true);
      else setDeck((d) => ({ ...d, cards: [...d.cards, ...fresh.filter((m) => !d.cards.some((c) => c.id === m.id))] }));
    });
    return () => { cancelled = true; };
  }, [cards, seen, exhausted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (match || (e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowLeft") decide(false);
      if (e.key === "ArrowRight") decide(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, match]);

  if (!current) {
    return (
      <EmptyState title="Tu as vu tout le monde pour l'instant" action={<ButtonLink href="/profile/questionnaire" variant="secondary">Ajuster mes critères</ButtonLink>}>
        Les profils affichés partagent ta ville, un budget et des dates compatibles. Élargis ton budget, tes dates ou assouplis un critère « impératif »,
        et reviens bientôt : de nouvelles personnes s&apos;inscrivent chaque jour.
      </EmptyState>
    );
  }

  const offset = leaving === "left" ? -600 : leaving === "right" ? 600 : dx;
  return (
    <div className="mx-auto w-full max-w-md">
      {failed && failed.cardId === current.id && (
        <div className="mb-3">
          <Notice tone="error">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{failed.message}</span>
              <Button size="sm" variant="secondary" onClick={() => decide(failed.liked)}>Réessayer</Button>
            </div>
          </Notice>
        </div>
      )}
      <div className="relative h-[calc(100dvh-230px)] min-h-[520px] md:h-[calc(100dvh-170px)]">
        {cards[1] && <div className="absolute inset-0 scale-[0.97] opacity-60" aria-hidden><ProfileCard key={cards[1].id} card={cards[1]} /></div>}
        <div
          className="absolute inset-0 touch-pan-y"
          style={{ transform: `translateX(${offset}px) rotate(${offset / 22}deg)`, transition: start.current === null ? "transform 220ms ease-out" : "none" }}
          onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; start.current = e.clientX; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
          onPointerUp={() => {
            const d = dx; start.current = null;
            if (d > THRESHOLD) decide(true); else if (d < -THRESHOLD) decide(false); else setDx(0);
          }}
          onPointerCancel={() => { start.current = null; setDx(0); }}
        >
          <ProfileCard key={current.id} card={current} />
          {dx > 40 && <span className="tape absolute left-5 top-6 rotate-[-8deg] text-lg">On se parle</span>}
          {dx < -40 && <span className="tape tape-blush absolute right-5 top-6 rotate-[8deg] text-lg">Pas pour moi</span>}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6">
        <button type="button" onClick={() => decide(false)} aria-label={`Passer ${current.firstName}`}
          className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-paper text-ink hover:border-ink">
          <X className="h-7 w-7" aria-hidden />
        </button>
        <button type="button" onClick={() => decide(true)} aria-label={`Proposer de se parler à ${current.firstName}`}
          className="flex h-16 items-center gap-2 rounded-full bg-door px-7 font-semibold text-white hover:bg-door-hover">
          <Handshake className="h-6 w-6" aria-hidden />On se parle ?
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Glisse la carte, ou utilise les flèches ← et → du clavier.</p>
      {match && <MatchOverlay me={myName} them={match.name} conversationId={match.conversationId} onClose={() => setMatch(null)} />}
    </div>
  );
}
