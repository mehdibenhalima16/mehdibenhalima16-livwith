import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COLUMNS, type Profile } from "@/lib/types";

/** Utilisateur authentifié (JWT vérifié), ou null. Mis en cache pour la requête. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub as string,
    email: (claims.email as string | undefined) ?? "",
    termsAcceptedAt: ((claims.user_metadata as Record<string, unknown> | undefined)?.terms_accepted_at as string | undefined) ?? null,
  };
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Utilisateur connecté, onboardé et non suspendu ; sinon redirection. */
export async function requireProfile() {
  const user = await requireUser();
  const profile = await getMyProfile();
  if (!profile?.onboarded_at) redirect("/onboarding");
  if (profile.suspended_at) redirect("/suspended");
  return { user, profile, supabase: await createClient() };
}

export const isAdmin = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});
