import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-5 py-24 text-center">
      <p className="tape text-sm">Porte 404</p>
      <h1 className="mt-6 font-display text-3xl font-bold">Personne à cette adresse</h1>
      <p className="mt-2 text-muted">La page a peut-être déménagé, ou n&apos;est plus visible pour toi.</p>
      <ButtonLink href="/discover" className="mt-6">Retour à l&apos;accueil</ButtonLink>
    </main>
  );
}
