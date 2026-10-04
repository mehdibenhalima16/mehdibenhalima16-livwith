import { AuthForm } from "@/components/AuthForm";
import { Field, Input } from "@/components/ui/Field";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Mot de passe oublié</h1>
      <p className="mb-6 mt-1 text-muted">On t&apos;envoie un lien pour en choisir un nouveau.</p>
      <AuthForm action={requestPasswordReset} submitLabel="Envoyer le lien" hideOnSuccess>
        <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      </AuthForm>
    </>
  );
}
