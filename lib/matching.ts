import { DEF, DIMENSIONS, weightOf, type Dim, type Lifestyle, type Preferences } from "./lifestyle";

/** Profil tel que vu par le moteur : réponses sur soi + attentes (côté serveur uniquement). */
export interface MatchInput {
  lifestyle: Lifestyle;
  preferences: Preferences;
}

export interface DimDetail {
  dim: Dim;
  aValue: number;
  bValue: number;
  /** Satisfaction de A vis-à-vis de la réponse de B (0, 0,5 ou 1) et poids de A. */
  satA: number;
  weightA: number;
  satB: number;
  weightB: number;
}

export interface CompatResult {
  /** Score final 0–100 (moyenne géométrique des deux sens). */
  score: number;
  /** Satisfaction de A envers B, puis de B envers A (0–100). */
  aToB: number;
  bToA: number;
  highlights: Dim[];
  frictions: Dim[];
  criteriaCount: number;
  details: DimDetail[];
}

/** 1 si la valeur est acceptée, 0,5 si elle est juste à côté (critère ordonné), 0 sinon. */
export function satisfaction(dim: Dim, accepted: number[], value: number): 0 | 0.5 | 1 {
  if (accepted.includes(value)) return 1;
  if (DEF[dim].kind === "categorical" || accepted.length === 0) return 0;
  const distance = Math.min(...accepted.map((a) => Math.abs(a - value)));
  return distance === 1 ? 0.5 : 0;
}

/** Satisfaction pondérée d'une personne envers les réponses d'une autre ; null si un impératif est violé. */
export function directional(prefs: Preferences, other: Lifestyle): { score: number; sats: Record<Dim, number> } | null {
  let num = 0;
  let den = 0;
  const sats = {} as Record<Dim, number>;
  for (const d of DIMENSIONS) {
    const p = prefs[d];
    const s = satisfaction(d, p.accept, other[d]);
    sats[d] = s;
    if (p.importance === 3 && s < 1) return null;
    const w = weightOf(p.importance);
    num += w * s;
    den += w;
  }
  return { score: den === 0 ? 1 : num / den, sats };
}

export function compatibility(a: MatchInput, b: MatchInput): CompatResult | null {
  const ab = directional(a.preferences, b.lifestyle);
  const ba = directional(b.preferences, a.lifestyle);
  if (!ab || !ba) return null;

  const details: DimDetail[] = DIMENSIONS.map((dim) => ({
    dim,
    aValue: a.lifestyle[dim],
    bValue: b.lifestyle[dim],
    satA: ab.sats[dim],
    weightA: weightOf(a.preferences[dim].importance),
    satB: ba.sats[dim],
    weightB: weightOf(b.preferences[dim].importance),
  }));
  const counted = details.filter((d) => d.weightA > 0 || d.weightB > 0);
  const highlights = counted
    .filter((d) => d.satA === 1 && d.satB === 1 && d.weightA > 0 && d.weightB > 0)
    .sort((x, y) => y.weightA + y.weightB - (x.weightA + x.weightB))
    .slice(0, 3)
    .map((d) => d.dim);
  const frictions = counted
    .filter((d) => (d.weightA > 0 && d.satA < 1) || (d.weightB > 0 && d.satB < 1))
    .sort((x, y) => y.weightA * (1 - y.satA) + y.weightB * (1 - y.satB) - (x.weightA * (1 - x.satA) + x.weightB * (1 - x.satB)))
    .map((d) => d.dim);

  return {
    score: Math.round(100 * Math.sqrt(ab.score * ba.score)),
    aToB: Math.round(100 * ab.score),
    bToA: Math.round(100 * ba.score),
    highlights,
    frictions,
    criteriaCount: counted.length,
    details,
  };
}

/** Compatibilité d'un groupe : moyenne des paires et paire la plus faible. */
export function groupCompatibility(members: { id: string; input: MatchInput }[]) {
  const pairs: { a: string; b: string; score: number | null }[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      pairs.push({ a: members[i].id, b: members[j].id, score: compatibility(members[i].input, members[j].input)?.score ?? null });
    }
  }
  if (pairs.length === 0) return null;
  const scores = pairs.map((p) => p.score ?? 0);
  const weakest = pairs.reduce((min, p) => ((p.score ?? 0) < (min.score ?? 0) ? p : min), pairs[0]);
  return { average: Math.round(scores.reduce((s, x) => s + x, 0) / scores.length), weakest, pairs };
}

/**
 * Vue transmissible au navigateur du membre A. Ne contient que :
 * le score final, la satisfaction de A (calculable par A lui-même), et par critère
 * les réponses publiques des deux personnes avec la satisfaction et le poids de A.
 * Aucune donnée dérivée des attentes privées de B (satB, weightB, bToA, points
 * forts ou frictions pondérés par B) n'en sort.
 */
export interface PublicCompat {
  score: number;
  mine: number;
  highlights: Dim[];
  frictions: Dim[];
  criteriaCount: number;
  details: { dim: Dim; aValue: number; bValue: number; satA: number; weightA: number }[];
}

export function publicView(r: CompatResult): PublicCompat {
  const mineDetails = r.details.map((d) => ({ dim: d.dim, aValue: d.aValue, bValue: d.bValue, satA: d.satA, weightA: d.weightA }));
  const counted = mineDetails.filter((d) => d.weightA > 0);
  return {
    score: r.score,
    mine: r.aToB,
    highlights: counted.filter((d) => d.satA === 1).sort((x, y) => y.weightA - x.weightA).slice(0, 3).map((d) => d.dim),
    frictions: counted.filter((d) => d.satA < 1).sort((x, y) => y.weightA * (1 - y.satA) - x.weightA * (1 - x.satA)).map((d) => d.dim),
    criteriaCount: counted.length,
    details: mineDetails,
  };
}
