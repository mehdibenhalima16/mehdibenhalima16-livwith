import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Field, Input } from "@/components/ui/Field";
import { updatePassword } from "@/lib/actions/auth";
import { getUser } from "@/lib/server/auth";

export const metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage() {
  if (!(await getUser())) redirect("/login?error=link");
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Nouveau mot de passe</h1>
      <p className="mb-6 mt-1 text-muted">Choisis-en un que tu n&apos;utilises nulle part ailleurs.</p>
      <AuthForm action={updatePassword} submitLabel="Enregistrer">
        <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum.">
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
      </AuthForm>
    </>
  );
}
