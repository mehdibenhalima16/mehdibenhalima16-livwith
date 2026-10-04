import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Field, Input } from "@/components/ui/Field";
import { signUp } from "@/lib/actions/auth";

export const metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Crée ton compte</h1>
      <p className="mb-6 mt-1 text-muted">Deux minutes pour le profil, deux pour le questionnaire.</p>
      <AuthForm action={signUp} submitLabel="Créer mon compte" hideOnSuccess>
        <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <label className="flex gap-3 text-sm"><input type="checkbox" name="adult" required className="mt-0.5 h-5 w-5 accent-door" />J&apos;ai 18 ans ou plus.</label>
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 accent-door" />
          <span>J&apos;accepte les <Link href="/legal/terms" className="text-door underline">conditions d&apos;utilisation</Link> et la <Link href="/legal/privacy" className="text-door underline">politique de confidentialité</Link>.</span>
        </label>
      </AuthForm>
      <p className="mt-5 text-center text-sm">Déjà inscrit·e ? <Link href="/login" className="font-semibold text-door hover:underline">Se connecter</Link></p>
    </>
  );
}
