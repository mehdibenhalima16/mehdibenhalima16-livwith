// Logique pure (sans dépendance serveur) pour pouvoir la tester avec des doublures.

export interface StorageLike {
  list(prefix: string, opts: { limit: number }): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
}

export class StorageCleanupError extends Error {
  constructor(public bucket: string, public stage: "list" | "remove" | "stalled", public removed: number, detail: string) {
    super(`storage_cleanup_failed:${bucket}:${stage}:${detail}`);
  }
}

const PAGE = 100;
const MAX_ROUNDS = 200; // 20 000 fichiers au plus : au-delà, on s'arrête plutôt que de boucler.

/**
 * Supprime tous les fichiers du dossier `userId/`. Idempotent : relancé après un échec,
 * il reprend là où il s'est arrêté. Lève StorageCleanupError au premier échec.
 */
export async function purgeFolder(storage: StorageLike, bucket: string, userId: string): Promise<number> {
  let removed = 0;
  let previous = "";
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await storage.list(userId, { limit: PAGE });
    if (error) throw new StorageCleanupError(bucket, "list", removed, error.message);
    const files = data ?? [];
    if (files.length === 0) return removed;
    const paths = files.map((f) => `${userId}/${f.name}`);
    const signature = paths.join("|");
    if (signature === previous) throw new StorageCleanupError(bucket, "stalled", removed, "les fichiers listés n'ont pas été supprimés");
    previous = signature;
    const res = await storage.remove(paths);
    if (res.error) throw new StorageCleanupError(bucket, "remove", removed, res.error.message);
    removed += paths.length;
  }
  throw new StorageCleanupError(bucket, "stalled", removed, "trop de fichiers");
}

export type DeletionResult =
  | { ok: true; removedFiles: number }
  | { ok: false; step: "pause" | "storage" | "auth"; message: string; removedFiles: number };

/**
 * Ordre choisi pour qu'une suppression interrompue reste récupérable par l'utilisateur :
 * 1. profil mis en pause (plus visible, même si des photos sont déjà effacées) ;
 * 2. fichiers effacés, bucket par bucket ; au moindre échec on s'arrête AVANT de supprimer le compte ;
 * 3. compte supprimé (cascade sur toutes les tables).
 * Supprimer le compte d'abord laisserait des photos orphelines que plus personne ne pourrait effacer.
 */
export async function runAccountDeletion(deps: {
  pause: () => Promise<{ error: { message: string } | null }>;
  purge: (bucket: string) => Promise<number>;
  deleteUser: () => Promise<{ error: { message: string } | null }>;
  buckets: string[];
}): Promise<DeletionResult> {
  const paused = await deps.pause();
  if (paused.error) return { ok: false, step: "pause", message: paused.error.message, removedFiles: 0 };
  let removedFiles = 0;
  for (const bucket of deps.buckets) {
    try {
      removedFiles += await deps.purge(bucket);
    } catch (e) {
      const extra = e instanceof StorageCleanupError ? e.removed : 0;
      return { ok: false, step: "storage", message: e instanceof Error ? e.message : String(e), removedFiles: removedFiles + extra };
    }
  }
  const { error } = await deps.deleteUser();
  if (error) return { ok: false, step: "auth", message: error.message, removedFiles };
  return { ok: true, removedFiles };
}
