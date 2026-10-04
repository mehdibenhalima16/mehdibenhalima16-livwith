import { legal } from "@/lib/legal";
export const metadata = { title: "Politique de confidentialité" };
export default function Privacy() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p>Responsable du traitement : {legal("publisherName")}, {legal("publisherAddress")}, {legal("publisherRegistration")}. Contact : {legal("contactEmail")}. Délégué à la protection des données : {legal("dpo")}.</p>
      <h2>Données collectées</h2>
      <p>Compte : adresse e-mail, mot de passe (haché par notre sous-traitant d&apos;authentification). Profil public : prénom, âge calculé, ville, budget, date d&apos;emménagement, activité, présentation, photos, réponses au questionnaire de vie commune. Données privées : date de naissance, critères acceptés et leur importance, préférences d&apos;âge et de composition du foyer. Activité : likes, matchs, messages, annonces, signalements, blocages.</p>
      <h2>Finalités et bases légales</h2>
      <p>Fournir le service de mise en relation (exécution du contrat) ; sécuriser la plateforme, détecter la fraude et modérer (intérêt légitime) ; respecter nos obligations légales. Nous ne vendons aucune donnée et n&apos;affichons pas de publicité ciblée.</p>
      <h2>Qui voit quoi</h2>
      <p>Les autres membres voient ton profil public et le score de compatibilité. Tes critères privés et ta date de naissance ne sont jamais montrés. Les photos sont stockées dans des espaces privés et servies par liens temporaires. Seules les personnes avec qui tu as matché peuvent t&apos;écrire.</p>
      <h2>Durées de conservation</h2>
      <p>Tant que ton compte est actif. Suppression immédiate à ta demande depuis les paramètres. Comptes inactifs et signalements : {legal("retention")}.</p>
      <h2>Sous-traitants et transferts</h2>
      <p>Base, authentification et fichiers : {legal("dataHost")}. Application : {legal("appHost")}. [À compléter : garanties encadrant d&apos;éventuels transferts hors UE, d&apos;après les contrats signés avec ces prestataires.]</p>
      <h2>Tes droits</h2>
      <p>Accès, rectification, effacement, portabilité (export JSON depuis les paramètres), opposition et limitation. Réclamation possible auprès de la CNIL (cnil.fr).</p>
    </>
  );
}
