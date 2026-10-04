import { describe, expect, it } from "vitest";
import { NETWORK_ERROR, performSwipe, removeCard, restoreCard, type DeckState } from "@/lib/swipe-flow";
import type { DeckCard } from "@/lib/types";

const card = (id: string) => ({ id, firstName: id }) as DeckCard;
const deferred = <T,>() => { let resolve!: (v: T) => void; const p = new Promise<T>((r) => (resolve = r)); return { p, resolve }; };

describe("pile de découverte en cas d'échec", () => {
  it("restaure la carte en tête, sans doublon, et l'oublie des cartes vues", () => {
    let s: DeckState = { cards: [card("a"), card("b")], seen: [] };
    s = removeCard(s, "a");
    expect(s).toEqual({ cards: [card("b")], seen: ["a"] });
    s = { ...s, cards: [...s.cards, card("a")] }; // rechargée entre-temps par la pagination
    s = restoreCard(s, card("a"));
    expect(s.cards.map((c) => c.id)).toEqual(["a", "b"]);
    expect(s.seen).toEqual([]);
  });

  it("une erreur renvoyée par le serveur remonte après le retrait, pour que la carte soit restaurée", async () => {
    const events: string[] = [];
    const r = await performSwipe({
      send: async () => { events.push("send"); return { error: "Tu vas un peu vite" }; },
      animate: async () => { events.push("animate"); },
      onRemoved: () => events.push("removed"),
    });
    expect(r.error).toBe("Tu vas un peu vite");
    expect(events.at(-1)).toBe("removed"); // la restauration se fait après le retrait, jamais avant
  });

  it("une exception réseau devient une erreur exploitable", async () => {
    const r = await performSwipe({ send: () => Promise.reject(new Error("fetch failed")), animate: async () => {}, onRemoved: () => {} });
    expect(r).toEqual({ error: NETWORK_ERROR });
  });

  it("si le serveur répond avant la fin de l'animation, le résultat attend quand même le retrait", async () => {
    const anim = deferred<void>();
    let removed = false;
    const pending = performSwipe({ send: async () => ({ error: "échec" }), animate: () => anim.p, onRemoved: () => { removed = true; } });
    await Promise.resolve();
    expect(removed).toBe(false);
    anim.resolve();
    const r = await pending;
    expect(removed).toBe(true);
    expect(r.error).toBe("échec");
  });

  it("un succès transmet le match", async () => {
    const r = await performSwipe({ send: async () => ({ matched: true, conversationId: "c1" }), animate: async () => {}, onRemoved: () => {} });
    expect(r).toEqual({ matched: true, conversationId: "c1" });
  });
});
