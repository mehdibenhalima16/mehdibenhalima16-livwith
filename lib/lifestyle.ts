// Les 10 critères du questionnaire. Même définition côté base (lifestyle_dims / lifestyle_max).
export const DIMENSIONS = [
  "cleanliness", "schedule", "quiet", "social", "guests", "remote", "smoking", "pets", "sharing", "duration",
] as const;
export type Dim = (typeof DIMENSIONS)[number];
export type Importance = 0 | 1 | 2 | 3;
export type Lifestyle = Record<Dim, number>;
export type Preference = { accept: number[]; importance: Importance };
export type Preferences = Record<Dim, Preference>;

export interface DimensionDef {
  key: Dim;
  label: string;
  question: string;
  acceptQuestion: string;
  kind: "ordinal" | "categorical";
  options: { value: number; label: string }[];
  defaultImportance: Importance;
  /** Valeurs toujours acceptées (ex. « pas d'animal »). */
  alwaysAccepted?: number[];
}

export const IMPORTANCE = [
  { value: 0, label: "Peu importe", weight: 0 },
  { value: 1, label: "Un peu", weight: 1 },
  { value: 2, label: "Important", weight: 3 },
  { value: 3, label: "Impératif", weight: 5 },
] as const;
export const weightOf = (i: Importance) => IMPORTANCE[i].weight;

const scale = (labels: string[]) => labels.map((label, i) => ({ value: i + 1, label }));

export const DIMENSION_DEFS: DimensionDef[] = [
  {
    key: "cleanliness", label: "Propreté", kind: "ordinal", defaultImportance: 2,
    question: "Ta relation au ménage et au rangement ?",
    acceptQuestion: "Chez tes colocs, tu acceptes…",
    options: scale(["Très détendu·e", "Plutôt souple", "Rangé·e sans excès", "Soigneux·se", "Impeccable, tout de suite"]),
  },
  {
    key: "schedule", label: "Rythme", kind: "ordinal", defaultImportance: 1,
    question: "Tes horaires au quotidien ?",
    acceptQuestion: "Les rythmes qui te conviennent chez les autres…",
    options: scale(["Très lève-tôt", "Plutôt du matin", "Horaires classiques", "Plutôt du soir", "Oiseau de nuit"]),
  },
  {
    key: "quiet", label: "Sommeil et calme", kind: "ordinal", defaultImportance: 2,
    question: "Le calme la nuit, pour toi ?",
    acceptQuestion: "Les besoins de calme compatibles avec toi…",
    options: scale(["Le bruit ne me gêne pas", "Peu sensible", "Calme après minuit", "Calme dès 23 h", "Silence complet"]),
  },
  {
    key: "social", label: "Vie commune", kind: "ordinal", defaultImportance: 2,
    question: "Quelle ambiance à la maison ?",
    acceptQuestion: "Les ambiances qui te vont…",
    options: scale(["Chacun chez soi", "Cordial, sans plus", "Quelques moments partagés", "Repas et soirées ensemble", "Une vraie bande"]),
  },
  {
    key: "guests", label: "Invités", kind: "ordinal", defaultImportance: 2,
    question: "Tu reçois du monde à la maison ?",
    acceptQuestion: "Chez tes colocs, tu acceptes des invités…",
    options: scale(["Rarement", "De temps en temps", "Une ou deux fois par semaine", "Souvent", "Presque tous les jours"]),
  },
  {
    key: "remote", label: "Télétravail", kind: "ordinal", defaultImportance: 1,
    question: "Tu travailles ou étudies depuis la maison ?",
    acceptQuestion: "Tu es à l'aise avec des colocs présents…",
    options: scale(["Jamais", "Un jour par semaine", "Deux ou trois jours", "Quatre jours", "Tous les jours"]),
  },
  {
    key: "smoking", label: "Tabac", kind: "ordinal", defaultImportance: 2,
    question: "Et le tabac ?",
    acceptQuestion: "Tu acceptes de vivre avec…",
    options: scale(["Non-fumeur·se", "Je fume dehors", "Je fume à l'intérieur"]),
  },
  {
    key: "pets", label: "Animaux", kind: "categorical", defaultImportance: 2, alwaysAccepted: [1],
    question: "Tu as un animal ?",
    acceptQuestion: "Les animaux que tu acceptes à la maison…",
    options: scale(["Pas d'animal", "Un chat", "Un chien", "Un autre animal"]),
  },
  {
    key: "sharing", label: "Partage", kind: "ordinal", defaultImportance: 2,
    question: "Partager les courses et les affaires ?",
    acceptQuestion: "Les façons de partager qui te conviennent…",
    options: scale(["Tout séparé", "Le strict minimum", "Les bases en commun", "Courses communes", "Tout en commun"]),
  },
  {
    key: "duration", label: "Durée", kind: "ordinal", defaultImportance: 2,
    question: "Combien de temps comptes-tu rester ?",
    acceptQuestion: "Des colocs qui restent…",
    options: scale(["Moins de 3 mois", "3 à 6 mois", "6 à 12 mois", "1 à 2 ans", "Plus de 2 ans"]),
  },
];

export const DEF: Record<Dim, DimensionDef> = Object.fromEntries(DIMENSION_DEFS.map((d) => [d.key, d])) as Record<Dim, DimensionDef>;
export const maxOf = (d: Dim) => DEF[d].options.length;
export const optionLabel = (d: Dim, v: number) => DEF[d].options.find((o) => o.value === v)?.label ?? "?";

/** Valeurs acceptées par défaut : ta réponse ± 1 (tout, pour les animaux). */
export function defaultAccept(d: Dim, self: number): number[] {
  const def = DEF[d];
  let values: number[];
  if (def.kind === "categorical") values = def.options.map((o) => o.value);
  else values = def.options.map((o) => o.value).filter((v) => Math.abs(v - self) <= 1);
  return withAlwaysAccepted(d, values);
}

export function withAlwaysAccepted(d: Dim, values: number[]): number[] {
  return [...new Set([...(DEF[d].alwaysAccepted ?? []), ...values])].sort((a, b) => a - b);
}

export function defaultPreferences(lifestyle: Lifestyle): Preferences {
  return Object.fromEntries(
    DIMENSIONS.map((d) => [d, { accept: defaultAccept(d, lifestyle[d]), importance: DEF[d].defaultImportance }]),
  ) as Preferences;
}

export function isCompleteLifestyle(l: Partial<Record<Dim, number>>): l is Lifestyle {
  return DIMENSIONS.every((d) => Number.isInteger(l[d]) && l[d]! >= 1 && l[d]! <= maxOf(d));
}
