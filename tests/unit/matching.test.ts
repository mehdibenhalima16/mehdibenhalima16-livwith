import { describe, expect, it } from "vitest";
import { compatibility, directional, groupCompatibility, satisfaction } from "@/lib/matching";
import { defaultPreferences, DIMENSIONS, type Lifestyle, type Preferences } from "@/lib/lifestyle";

// Base neutre : critères ignorés (importance 0) sauf ceux de l'exemple.
function base(): { lifestyle: Lifestyle; preferences: Preferences } {
  const lifestyle = Object.fromEntries(DIMENSIONS.map((d) => [d, 1])) as Lifestyle;
  const preferences = Object.fromEntries(DIMENSIONS.map((d) => [d, { accept: [1], importance: 0 }])) as Preferences;
  return { lifestyle, preferences };
}

// Exemple du dossier produit, section 5 : Léa et Karim.
function lea() {
  const p = base();
  p.lifestyle.cleanliness = 4; p.preferences.cleanliness = { accept: [3, 4, 5], importance: 2 };
  p.lifestyle.guests = 2; p.preferences.guests = { accept: [1, 2, 3], importance: 2 };
  p.lifestyle.smoking = 1; p.preferences.smoking = { accept: [1], importance: 3 };
  p.lifestyle.social = 3; p.preferences.social = { accept: [2, 3, 4], importance: 1 };
  return p;
}
function karim() {
  const p = base();
  p.lifestyle.cleanliness = 3; p.preferences.cleanliness = { accept: [2, 3, 4], importance: 2 };
  p.lifestyle.guests = 4; p.preferences.guests = { accept: [3, 4, 5], importance: 1 };
  p.lifestyle.smoking = 1; p.preferences.smoking = { accept: [1, 2], importance: 2 };
  p.lifestyle.social = 4; p.preferences.social = { accept: [3, 4, 5], importance: 2 };
  return p;
}

describe("satisfaction", () => {
  it("vaut 1 si accepté, 0,5 juste à côté, 0 au-delà ; 0 pour un critère catégoriel non accepté", () => {
    expect(satisfaction("guests", [1, 2, 3], 3)).toBe(1);
    expect(satisfaction("guests", [1, 2, 3], 4)).toBe(0.5);
    expect(satisfaction("guests", [1, 2, 3], 5)).toBe(0);
    expect(satisfaction("pets", [1, 2], 3)).toBe(0);
  });
});

describe("exemple Léa et Karim (dossier, section 5)", () => {
  it("Léa vers Karim = 0,875 ; Karim vers Léa = 0,95 ; compatibilité 91 %", () => {
    expect(directional(lea().preferences, karim().lifestyle)!.score).toBeCloseTo(0.875, 10);
    expect(directional(karim().preferences, lea().lifestyle)!.score).toBeCloseTo(0.95, 10);
    const r = compatibility(lea(), karim())!;
    expect(r.score).toBe(91);
    expect([r.aToB, r.bToA]).toEqual([88, 95]);
    expect(r.frictions).toEqual(["guests"]);
    expect(r.criteriaCount).toBe(4);
    expect(r.highlights).toContain("smoking");
  });

  it("est symétrique", () => {
    expect(compatibility(karim(), lea())!.score).toBe(91);
  });
});

describe("règles du score", () => {
  it("un critère impératif non respecté exclut la paire", () => {
    const k = karim();
    k.lifestyle.smoking = 2;
    expect(compatibility(lea(), k)).toBeNull();
  });

  it("la moyenne géométrique pénalise le déséquilibre (100 % et 40 % donnent 63 %)", () => {
    expect(Math.round(100 * Math.sqrt(1 * 0.4))).toBe(63);
  });

  it("sans aucune attente, la satisfaction vaut 100 %", () => {
    expect(compatibility(base(), base())!.score).toBe(100);
  });

  it("les préférences par défaut acceptent ta réponse ± 1 et tous les animaux", () => {
    const l = { ...base().lifestyle, cleanliness: 3 } as Lifestyle;
    const p = defaultPreferences(l);
    expect(p.cleanliness.accept).toEqual([2, 3, 4]);
    expect(p.pets.accept).toEqual([1, 2, 3, 4]);
  });

  it("un groupe affiche la moyenne des paires et la paire la plus faible", () => {
    const g = groupCompatibility([
      { id: "lea", input: lea() },
      { id: "karim", input: karim() },
      { id: "neutre", input: base() },
    ])!;
    expect(g.pairs).toHaveLength(3);
    expect(g.weakest.score).toBe(Math.min(...g.pairs.map((p) => p.score ?? 0)));
  });
});
