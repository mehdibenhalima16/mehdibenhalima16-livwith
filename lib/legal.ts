/**
 * Informations légales de l'éditeur. VOLONTAIREMENT VIDES : à renseigner par l'éditeur
 * avant toute ouverture, même en bêta privée. Tant qu'une valeur est null, les pages
 * légales affichent un marqueur « [À compléter : …] » visible.
 */
export const LEGAL = {
  /** Adresse e-mail de contact, support et exercice des droits RGPD. */
  contactEmail: null as string | null,
  /** Nom et prénom (entrepreneur individuel) ou dénomination sociale et forme juridique. */
  publisherName: null as string | null,
  /** Adresse du siège ou du domicile professionnel. */
  publisherAddress: null as string | null,
  /** RCS ou RNE, numéro SIREN, capital social si société. */
  publisherRegistration: null as string | null,
  /** Numéro de TVA intracommunautaire, si assujetti. */
  vatNumber: null as string | null,
  /** Téléphone (exigé par la LCEN pour les éditeurs professionnels). */
  publisherPhone: null as string | null,
  /** Directeur ou directrice de la publication. */
  publicationDirector: null as string | null,
  /** Hébergeur de l'application : nom, adresse, téléphone (ex. l'entité Vercel du contrat). */
  appHost: null as string | null,
  /** Région et entité Supabase retenues pour la base et les fichiers. */
  dataHost: null as string | null,
  /** Délégué à la protection des données, s'il est désigné. */
  dpo: null as string | null,
  /** Médiateur de la consommation (obligatoire si le service devient payant pour des consommateurs). */
  consumerMediator: null as string | null,
  /** Durée d'inactivité avant suppression d'un compte, durée de conservation des signalements. */
  retention: null as string | null,
};

export type LegalKey = keyof typeof LEGAL;

export const LEGAL_LABELS: Record<LegalKey, string> = {
  contactEmail: "adresse e-mail de contact",
  publisherName: "identité de l'éditeur",
  publisherAddress: "adresse de l'éditeur",
  publisherRegistration: "immatriculation (RCS ou RNE, SIREN)",
  vatNumber: "numéro de TVA, le cas échéant",
  publisherPhone: "téléphone de l'éditeur",
  publicationDirector: "directeur ou directrice de la publication",
  appHost: "hébergeur de l'application",
  dataHost: "hébergeur des données et région",
  dpo: "délégué à la protection des données, s'il est désigné",
  consumerMediator: "médiateur de la consommation",
  retention: "durées de conservation",
};

export const legal = (key: LegalKey) => LEGAL[key] ?? `[À compléter : ${LEGAL_LABELS[key]}]`;
export const missingLegal = () => (Object.keys(LEGAL) as LegalKey[]).filter((k) => !LEGAL[k]);
