import type { DeckCard } from "./types";

export type SwipeOutcome = { error?: string; matched?: boolean; conversationId?: string };
export interface DeckState { cards: DeckCard[]; seen: string[] }

export const NETWORK_ERROR = "Connexion interrompue : ton choix n'a pas été enregistré.";

/** Retire la carte du dessus et la note comme vue. */
export function removeCard(s: DeckState, id: string): DeckState {
  return { cards: s.cards.filter((c) => c.id !== id), seen: s.seen.includes(id) ? s.seen : [...s.seen, id] };
}

/** Remet une carte en tête (choix non enregistré), sans doublon, et l'oublie des cartes vues. */
export function restoreCard(s: DeckState, card: DeckCard): DeckState {
  return { cards: [card, ...s.cards.filter((c) => c.id !== card.id)], seen: s.seen.filter((id) => id !== card.id) };
}

/**
 * Envoie le choix pendant l'animation de sortie. La carte n'est retirée qu'après l'animation ;
 * le résultat n'est connu qu'une fois l'envoi terminé, même s'il répond avant la fin de l'animation.
 * Une exception réseau est convertie en erreur, pour que l'appelant puisse restaurer la carte.
 */
export async function performSwipe(opts: {
  send: () => Promise<SwipeOutcome>;
  animate: () => Promise<void>;
  onRemoved: () => void;
}): Promise<SwipeOutcome> {
  const sending = opts.send().then(
    (r) => r ?? { error: NETWORK_ERROR },
    () => ({ error: NETWORK_ERROR }),
  );
  await opts.animate();
  opts.onRemoved();
  return sending;
}
