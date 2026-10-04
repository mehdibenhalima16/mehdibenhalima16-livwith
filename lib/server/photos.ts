import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeFolder } from "@/lib/account-deletion";

export type Bucket = "avatars" | "listing-photos";

/**
 * URL signées (1 h) pour des chemins que l'appelant a DÉJÀ obtenus via une requête soumise à la RLS.
 * Les buckets sont privés : sans signature, aucune photo n'est accessible.
 */
export async function signPaths(bucket: Bucket, paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

/** Supprime tout le dossier d'un utilisateur dans un bucket. Lève StorageCleanupError en cas d'échec. */
export async function deleteUserFolder(bucket: Bucket, userId: string): Promise<number> {
  return purgeFolder(createAdminClient().storage.from(bucket), bucket, userId);
}
