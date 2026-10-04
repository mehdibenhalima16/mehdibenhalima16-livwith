"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { emailSchema, passwordSchema, safeNext } from "@/lib/validation";

export type FormState = { error?: string; ok?: string } | null;

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email.success || !password) return { error: "E-mail ou mot de passe incorrect." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (error.message.toLowerCase().includes("confirm")) return { error: "Confirme d'abord ton adresse e-mail (lien reçu par mail)." };
    return { error: "E-mail ou mot de passe incorrect." };
  }
  redirect(safeNext(String(form.get("next") ?? ""), "/discover"));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  if (!email.success) return { error: "Adresse e-mail invalide." };
  if (!password.success) return { error: "Mot de passe : 8 caractères minimum." };
  if (form.get("adult") !== "on") return { error: "Livwith est réservé aux personnes majeures." };
  if (form.get("terms") !== "on") return { error: "Accepte les conditions d'utilisation et la politique de confidentialité." };

  // Message clair pour les personnes non invitées. La base refuse de toute façon (déclencheur sur auth.users).
  const invited = await createAdminClient().rpc("beta_email_allowed", { p_email: email.data });
  if (invited.error || invited.data !== true) {
    return { error: "Livwith est en bêta privée, sur invitation. Cette adresse n'est pas invitée." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=/onboarding`,
      data: { terms_accepted_at: new Date().toISOString() },
    },
  });
  if (error) {
    if (error.message.includes("beta_invite_only") || error.message.toLowerCase().includes("database error saving new user")) {
      return { error: "Livwith est en bêta privée, sur invitation. Cette adresse n'est pas invitée." };
    }
    if (error.message.toLowerCase().includes("password")) return { error: "Mot de passe trop faible : ajoute des chiffres ou des symboles." };
    return { error: "Inscription impossible pour le moment. Réessaie." };
  }
  if (data.session) redirect("/onboarding"); // confirmation e-mail désactivée (développement)
  return { ok: "Presque fini : clique sur le lien envoyé à ton adresse e-mail pour activer ton compte." };
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (email.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password` });
  }
  // Même réponse que l'adresse existe ou non : pas d'énumération des comptes.
  return { ok: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { error: "Mot de passe : 8 caractères minimum." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Lien expiré : redemande un e-mail de réinitialisation." };
  redirect("/discover");
}
