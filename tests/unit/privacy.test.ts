import { describe, expect, it } from "vitest";
import { compatibility, publicView } from "@/lib/matching";
import { toDeckCard, type PoolRow } from "@/lib/deck";
import { DIMENSIONS, type Lifestyle, type Preferences } from "@/lib/lifestyle";

const lifestyle = (o: Partial<Lifestyle> = {}) => ({ ...Object.fromEntries(DIMENSIONS.map((d) => [d, d === "smoking" || d === "pets" ? 1 : 3])), ...o }) as Lifestyle;
const prefs = (o: Partial<Preferences> = {}) =>
  ({ ...Object.fromEntries(DIMENSIONS.map((d) => [d, { accept: d === "smoking" || d === "pets" ? [1] : [2, 3, 4], importance: 1 }])), ...o }) as Preferences;

const me = { lifestyle: lifestyle({ guests: 2 }), preferences: prefs({ cleanliness: { accept: [3, 4], importance: 2 } }) };
// Même réponses publiques, attentes privées très différentes.
const other1 = { lifestyle: lifestyle({ cleanliness: 4 }), preferences: prefs({ guests: { accept: [1, 2], importance: 2 }, quiet: { accept: [3], importance: 0 } }) };
const other2 = { lifestyle: lifestyle({ cleanliness: 4 }), preferences: prefs({ guests: { accept: [4, 5], importance: 1 }, quiet: { accept: [2, 3, 4], importance: 2 } }) };

describe("confidentialité du score envoyé au navigateur", () => {
  it("ne contient aucun champ issu des attentes de l'autre personne", () => {
    const v = publicView(compatibility(me, other1)!);
    expect(Object.keys(v).sort()).toEqual(["criteriaCount", "details", "frictions", "highlights", "mine", "score"]);
    for (const d of v.details) expect(Object.keys(d).sort()).toEqual(["aValue", "bValue", "dim", "satA", "weightA"]);
    const json = JSON.stringify(v);
    for (const key of ["satB", "weightB", "bToA", "aToB", "preferences", "accept", "importance"]) expect(json).not.toContain(key);
  });

  it("hors score final, tout est identique quelles que soient les attentes privées de l'autre", () => {
    const v1 = publicView(compatibility(me, other1)!);
    const v2 = publicView(compatibility(me, other2)!);
    expect(v1.score).not.toBe(v2.score); // seul le score agrégé change
    const { score: _s1, ...rest1 } = v1;
    const { score: _s2, ...rest2 } = v2;
    expect(rest1).toEqual(rest2);
  });

  it("la carte de découverte est construite en liste blanche, sans les attentes de la ligne serveur", () => {
    const row: PoolRow = {
      id: "b", first_name: "Karim", occupation: null, bio: "", city: "lyon", budget_min: 400, budget_max: 600,
      move_in_date: "2026-11-01", intents: ["host"], photos: ["b/p.jpg"], is_demo: false, age: 29,
      lifestyle: other1.lifestyle, preferences: other1.preferences,
    };
    const card = toDeckCard(row, compatibility(me, other1)!, { "b/p.jpg": "https://signed" });
    const json = JSON.stringify(card);
    expect(json).not.toContain("preferences");
    expect(json).not.toContain("accept");
    expect(json).not.toContain("weightB");
    expect(card.photos).toEqual(["https://signed"]);
  });
});
