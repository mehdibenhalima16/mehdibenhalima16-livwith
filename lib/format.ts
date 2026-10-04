const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
export const longDate = (iso: string) => dateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
export const shortDate = (iso: string) => shortFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
export const clock = (iso: string) => timeFmt.format(new Date(iso));

export function moveInLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.getTime() <= Date.now() ? "Dès maintenant" : `À partir du ${shortDate(iso)}`;
}

export function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return shortDate(iso);
}

/** Message d'erreur lisible à partir des codes levés par la base. */
export function dbErrorMessage(message: string | undefined) {
  const m = message ?? "";
  if (m.includes("rate_limited")) return "Tu vas un peu vite : réessaie dans quelques minutes.";
  if (m.includes("too_many_active_listings")) return "Tu as déjà 3 annonces actives : archives-en une d'abord.";
  if (m.includes("photos_required")) return "Ajoute au moins une photo pour publier.";
  if (m.includes("blocked")) return "Cette action n'est pas possible avec cette personne.";
  if (m.includes("not_a_match")) return "Tu ne peux inviter que tes matchs.";
  if (m.includes("group_full")) return "Le groupe est complet (6 personnes).";
  if (m.includes("profile_incomplete")) return "Termine ton profil d'abord.";
  if (m.includes("listing_removed")) return "Cette annonce a été retirée par la modération.";
  if (m.includes("duplicate key") && m.includes("reports")) return "Tu as déjà signalé ce contenu. Merci.";
  if (m.includes("birth_date")) return "Livwith est réservé aux personnes majeures.";
  return "Une erreur est survenue. Réessaie.";
}
