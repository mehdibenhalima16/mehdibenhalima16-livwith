// Identité produit : renommer la marque = changer ces constantes.
export const BRAND = {
  name: "Livwith",
  tagline: "Choisis avec qui tu vis.",
  taglineEn: "Choose who you live with.",
} as const;

export const CITIES = [
  { slug: "paris", name: "Paris" },
  { slug: "lyon", name: "Lyon" },
  { slug: "marseille", name: "Marseille" },
  { slug: "toulouse", name: "Toulouse" },
  { slug: "bordeaux", name: "Bordeaux" },
  { slug: "lille", name: "Lille" },
  { slug: "nantes", name: "Nantes" },
  { slug: "montpellier", name: "Montpellier" },
  { slug: "rennes", name: "Rennes" },
  { slug: "strasbourg", name: "Strasbourg" },
  { slug: "grenoble", name: "Grenoble" },
  { slug: "nice", name: "Nice" },
] as const;
export type CitySlug = (typeof CITIES)[number]["slug"];
export const CITY_SLUGS = CITIES.map((c) => c.slug) as [CitySlug, ...CitySlug[]];
export const cityName = (slug: string) => CITIES.find((c) => c.slug === slug)?.name ?? slug;

export const INTENTS = [
  { value: "room", label: "Je cherche une chambre", short: "Cherche une chambre" },
  { value: "host", label: "J'ai un logement et je cherche un·e coloc", short: "A un logement" },
  { value: "team", label: "Je veux former un groupe pour chercher ensemble", short: "Forme un groupe" },
] as const;
export type Intent = (typeof INTENTS)[number]["value"];

export const GENDERS = [
  { value: "woman", label: "Femme" },
  { value: "man", label: "Homme" },
  { value: "nonbinary", label: "Non-binaire" },
] as const;

export const HOUSEHOLD_PREFS = [
  { value: "any", label: "Peu importe" },
  { value: "women", label: "Uniquement des femmes" },
  { value: "men", label: "Uniquement des hommes" },
] as const;

export const AMENITIES = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "washing_machine", label: "Lave-linge" },
  { value: "dishwasher", label: "Lave-vaisselle" },
  { value: "balcony", label: "Balcon" },
  { value: "elevator", label: "Ascenseur" },
  { value: "parking", label: "Parking" },
  { value: "bike_storage", label: "Local vélo" },
  { value: "garden", label: "Jardin" },
  { value: "air_conditioning", label: "Climatisation" },
  { value: "near_transit", label: "Transports proches" },
  { value: "private_bathroom", label: "Salle de bain privée" },
  { value: "desk", label: "Bureau" },
] as const;
export type Amenity = (typeof AMENITIES)[number]["value"];

export const REPORT_REASONS = [
  { value: "fake", label: "Faux profil ou fausse annonce" },
  { value: "scam", label: "Tentative d'arnaque" },
  { value: "harassment", label: "Harcèlement ou propos insistants" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "discrimination", label: "Discrimination" },
  { value: "underage", label: "Personne mineure" },
  { value: "other", label: "Autre" },
] as const;

export const LIMITS = { profilePhotos: 5, listingPhotos: 8, deckSize: 20, maxGroupSize: 6 } as const;
