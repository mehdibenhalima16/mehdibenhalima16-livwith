import { describe, expect, it, vi } from "vitest";
import { purgeFolder, runAccountDeletion, StorageCleanupError, type StorageLike } from "@/lib/account-deletion";

/** Faux Storage : un dossier de fichiers, avec pannes injectables. */
function fakeStorage(files: string[], opts: { failListAt?: number; failRemoveAt?: number; ignoreRemove?: boolean } = {}) {
  const store = new Set(files);
  let lists = 0, removes = 0;
  const s: StorageLike & { store: Set<string> } = {
    store,
    async list(prefix, { limit }) {
      lists++;
      if (opts.failListAt === lists) return { data: null, error: { message: "list 503" } };
      return { data: [...store].filter((f) => f.startsWith(`${prefix}/`)).slice(0, limit).map((f) => ({ name: f.split("/")[1] })), error: null };
    },
    async remove(paths) {
      removes++;
      if (opts.failRemoveAt === removes) return { data: null, error: { message: "remove 500" } };
      if (!opts.ignoreRemove) paths.forEach((p) => store.delete(p));
      return { data: paths, error: null };
    },
  };
  return s;
}
const many = (n: number) => Array.from({ length: n }, (_, i) => `u1/f${i}.jpg`);

describe("purgeFolder", () => {
  it("supprime tout, page par page, sans toucher aux autres dossiers", async () => {
    const s = fakeStorage([...many(250), "u2/x.jpg"]);
    expect(await purgeFolder(s, "avatars", "u1")).toBe(250);
    expect([...s.store]).toEqual(["u2/x.jpg"]);
  });

  it("lève une erreur explicite si la liste échoue, et reprend au relancement", async () => {
    const s = fakeStorage(many(150), { failListAt: 2 });
    await expect(purgeFolder(s, "avatars", "u1")).rejects.toMatchObject({ stage: "list", removed: 100 });
    expect(s.store.size).toBe(50);
    expect(await purgeFolder(s, "avatars", "u1")).toBe(50);
    expect(s.store.size).toBe(0);
  });

  it("lève une erreur explicite si la suppression échoue", async () => {
    const s = fakeStorage(many(10), { failRemoveAt: 1 });
    const err = await purgeFolder(s, "listing-photos", "u1").catch((e) => e);
    expect(err).toBeInstanceOf(StorageCleanupError);
    expect(err.stage).toBe("remove");
  });

  it("ne boucle pas indéfiniment si Storage ne supprime rien sans signaler d'erreur", async () => {
    const s = fakeStorage(many(3), { ignoreRemove: true });
    await expect(purgeFolder(s, "avatars", "u1")).rejects.toMatchObject({ stage: "stalled" });
  });
});

describe("runAccountDeletion", () => {
  const ok = { error: null };
  it("n'efface jamais le compte si le nettoyage des fichiers échoue", async () => {
    const deleteUser = vi.fn(async () => ok);
    const r = await runAccountDeletion({
      buckets: ["avatars", "listing-photos"],
      pause: async () => ok,
      purge: async (b) => { if (b === "listing-photos") throw new StorageCleanupError(b, "remove", 2, "500"); return 3; },
      deleteUser,
    });
    expect(r).toMatchObject({ ok: false, step: "storage", removedFiles: 5 });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("n'efface rien si la mise en pause échoue", async () => {
    const purge = vi.fn(async () => 0);
    const r = await runAccountDeletion({ buckets: ["avatars"], pause: async () => ({ error: { message: "rls" } }), purge, deleteUser: async () => ok });
    expect(r).toMatchObject({ ok: false, step: "pause" });
    expect(purge).not.toHaveBeenCalled();
  });

  it("signale l'échec de la suppression du compte après nettoyage, et un second essai aboutit", async () => {
    let attempts = 0;
    const deps = { buckets: ["avatars"], pause: async () => ok, purge: async () => 0, deleteUser: async () => (++attempts === 1 ? { error: { message: "auth 500" } } : ok) };
    expect(await runAccountDeletion(deps)).toMatchObject({ ok: false, step: "auth" });
    expect(await runAccountDeletion(deps)).toEqual({ ok: true, removedFiles: 0 });
  });
});
