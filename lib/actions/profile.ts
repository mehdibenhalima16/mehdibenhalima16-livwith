"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser, requireProfile } from "@/lib/server/auth";
import { deleteUserFolder } from "@/lib/server/photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAccountDeletion } from "@/lib/account-deletion";
import { basicsSchema, firstIssue, lifestyleSchema, onboardingSchema, preferencesSchema } from "@/lib/validation";
import { withAlwaysAccepted, DIMENSIONS } from "@/lib/lifestyle";
import { dbErrorMessage } from "@/lib/format";

export type ActionResult = { error?: string; ok?: boolean };

function normalizePrefs<T extends Record<string, { accept: number[]; importance: number }>>(p: T): T {
  for (const d of DIMENSIONS) p[d].accept = withAlwaysAccepted(d, p[d].accept);
  return p;
}

export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Session expirée : reconnecte-toi." };
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  if (v.basics.photos.some((p) => !p.startsWith(`${user.id}/`))) return { error: "Photo invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_onboarding", {
    p_first_name: v.basics.first_name, p_gender: v.basics.gender, p_occupation: v.basics.occupation,
    p_bio: v.basics.bio, p_city: v.basics.city, p_budget_min: v.basics.budget_min, p_budget_max: v.basics.budget_max,
    p_move_in_date: v.basics.move_in_date, p_intents: v.basics.intents, p_photos: v.basics.photos,
    p_lifestyle: v.lifestyle, p_preferences: normalizePrefs(v.preferences), p_birth_date: v.birth_date,
    p_age_min: v.age_min, p_age_max: v.age_max, p_household_pref: v.household_pref,
    p_terms_accepted_at: user.termsAcceptedAt ?? new Date().toISOString(),
  });
  if (error) return { error: dbErrorMessage(error.message) };
  redirect("/discover");
}

export async function updateBasics(input: unknown): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const parsed = basicsSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  if (v.photos.length === 0) return { error: "Garde au moins une photo." };
  if (v.photos.some((p) => !p.startsWith(`${user.id}/`))) return { error: "Photo invalide." };
  const { error } = await supabase.from("profiles").update({ ...v, occupation: v.occupation || null }).eq("id", user.id);
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath("/", "layout");
  return { ok: true };
}

const prefsExtraSchema = z.object({
  age_min: z.coerce.number().int().min(18).max(99),
  age_max: z.coerce.number().int().min(18).max(99),
  household_pref: z.enum(["any", "women", "men"]),
});

export async function updateQuestionnaire(input: unknown): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const parsed = z.object({ lifestyle: lifestyleSchema, preferences: preferencesSchema, extra: prefsExtraSchema }).safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { lifestyle, preferences, extra } = parsed.data;
  if (extra.age_min > extra.age_max) return { error: "Tranche d'âge invalide." };
  const a = await supabase.from("profiles").update({ lifestyle }).eq("id", user.id);
  if (a.error) return { error: dbErrorMessage(a.error.message) };
  const b = await supabase.from("profiles_private").update({ preferences: normalizePrefs(preferences), ...extra }).eq("id", user.id);
  if (b.error) return { error: dbErrorMessage(b.error.message) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPaused(paused: boolean): Promise<ActionResult> {
  const { user, supabase } = await requireProfile();
  const { error } = await supabase.from("profiles").update({ is_paused: paused }).eq("id", user.id);
  if (error) return { error: dbErrorMessage(error.message) };
  revalidatePath("/settings");
  return { ok: true };
}

/** Droit à l'effacement : pause, photos, puis compte. Une interruption se rattrape en relançant. */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "Session expirée." };
  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") return { error: "Tape SUPPRIMER pour confirmer." };
  const supabase = await createClient();
  const result = await runAccountDeletion({
    buckets: ["avatars", "listing-photos"],
    pause: async () => {
      const { error } = await supabase.from("profiles").update({ is_paused: true }).eq("id", user.id);
      return { error };
    },
    purge: (bucket) => deleteUserFolder(bucket as "avatars" | "listing-photos", user.id),
    deleteUser: () => createAdminClient().auth.admin.deleteUser(user.id),
  });
  if (!result.ok) {
    console.error("[deleteAccount]", user.id, result.step, result.message, `fichiers supprimés : ${result.removedFiles}`);
    if (result.step === "pause") return { error: "Suppression impossible pour le moment. Rien n'a été effacé : réessaie." };
    return {
      error: "La suppression a été interrompue. Ton profil est masqué et ton compte existe toujours : relance la suppression pour la terminer. Si l'erreur persiste, écris-nous.",
    };
  }
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
