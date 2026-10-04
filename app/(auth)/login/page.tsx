import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Field, Input } from "@/components/ui/Field";
import { signIn } from "@/lib/actions/auth";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Bon retour</h1>
      <p className="mb-6 mt-1 text-muted">Connecte-toi pour retrouver tes matchs.</p>
      {error && <p className="mb-4 rounded-2xl bg-alert-soft px-4 py-3 text-sm text-alert">Ce lien n&apos;est plus valide. Reconnecte-toi ou redemande un e-mail.</p>}
      <AuthForm action={signIn} submitLabel="Se connecter">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Mot de passe" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      </AuthForm>
      <div className="mt-5 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-door hover:underline">Mot de passe oublié</Link>
        <Link href="/signup" className="font-semibold text-door hover:underline">Créer un compte</Link>
      </div>
    </>
  );
}
