import { BRAND } from "@/lib/config";
import { legal } from "@/lib/legal";
import Link from "next/link";
export const metadata = { title: "Conditions d'utilisation" };
export default function Terms() {
  return (
    <>
      <h1>Conditions d&apos;utilisation</h1>
      <p>{BRAND.name} est un service de mise en relation entre personnes cherchant à vivre en colocation. {BRAND.name} n&apos;est ni bailleur, ni agent immobilier, et n&apos;intervient pas dans les contrats conclus entre membres. Éditeur et hébergeur : voir les <Link href="/legal/notice" className="underline">mentions légales</Link>.</p>
      <h2>Accès</h2>
      <p>Réservé aux personnes majeures. Un seul compte par personne. Les informations fournies doivent être exactes.</p>
      <h2>Règles de conduite</h2>
      <p>Sont interdits : faux profils et fausses annonces, demandes de paiement avant visite ou signature, harcèlement, contenus sexuels ou violents, et toute discrimination interdite par la loi, notamment dans le choix d&apos;un locataire (loi du 6 juillet 1989, art. 1 ; Code pénal, art. 225-1). [Faire valider la préférence de composition du foyer.]</p>
      <h2>Annonces</h2>
      <p>L&apos;annonceur garantit avoir le droit de louer ou sous-louer le bien. Les annonces peuvent être vérifiées, suspendues ou retirées par la modération.</p>
      <h2>Score de compatibilité</h2>
      <p>Le score est calculé à partir des réponses déclarées. Il ne constitue ni une garantie d&apos;entente ni une évaluation des personnes.</p>
      <h2>Modération et sanctions</h2>
      <p>Tout membre peut signaler un contenu. Nous pouvons retirer un contenu ou suspendre un compte en cas de manquement. Contestation : {legal("contactEmail")}.</p>
      <h2>Responsabilité, résiliation, droit applicable</h2>
      <p>Résiliation à tout moment depuis les paramètres. Médiateur de la consommation : {legal("consumerMediator")}. [À compléter avec un juriste : limitation de responsabilité, droit applicable, juridiction.]</p>
    </>
  );
}
