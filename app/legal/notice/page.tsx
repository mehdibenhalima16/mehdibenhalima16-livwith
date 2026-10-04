import { legal } from "@/lib/legal";
export const metadata = { title: "Mentions légales" };
export default function Notice() {
  return (
    <>
      <h1>Mentions légales</h1>
      <h2>Éditeur</h2>
      <p>{legal("publisherName")}<br />{legal("publisherAddress")}<br />{legal("publisherRegistration")}<br />TVA : {legal("vatNumber")}<br />Téléphone : {legal("publisherPhone")}<br />Contact : {legal("contactEmail")}</p>
      <h2>Directeur ou directrice de la publication</h2>
      <p>{legal("publicationDirector")}</p>
      <h2>Hébergement</h2>
      <p>Application : {legal("appHost")}<br />Données : {legal("dataHost")}</p>
    </>
  );
}
