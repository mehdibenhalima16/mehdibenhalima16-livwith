import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asUser, createUser, freshDatabase } from "./helpers";

let db: pg.Client;
beforeAll(async () => { db = await freshDatabase("livwith_beta_test"); }, 60_000);
afterAll(async () => { await db?.end(); });
const q = (sql: string, p: unknown[] = []) => db.query(sql, p);

describe("bêta sur invitation", () => {
  it("refuse toute création de compte non invitée, quel que soit le chemin", async () => {
    // Même insertion que celle faite par le service Auth lors d'une inscription.
    await expect(q("insert into auth.users (email) values ('inconnu@exemple.fr')")).rejects.toThrow(/beta_invite_only/);
    // Connexion anonyme : pas d'e-mail.
    await expect(q("insert into auth.users (email) values (null)")).rejects.toThrow(/beta_invite_only/);
  });

  it("accepte un e-mail invité, sans tenir compte de la casse ni des espaces", async () => {
    await q("insert into public.beta_allowlist (email) values ('testeur.a@exemple.fr')");
    await q("insert into auth.users (email) values ('  Testeur.A@Exemple.fr ')");
  });

  it("empêche un compte de changer pour une adresse non invitée", async () => {
    await q("insert into public.beta_allowlist (email) values ('testeur.b@exemple.fr')");
    const { rows } = await q("insert into auth.users (email) values ('testeur.b@exemple.fr') returning id");
    await expect(q("update auth.users set email = 'autre@exemple.fr' where id = $1", [rows[0].id])).rejects.toThrow(/beta_invite_only/);
  });

  it("reste fermé si le réglage disparaît, s'ouvre seulement sur décision explicite", async () => {
    await q("delete from public.beta_settings");
    await expect(q("insert into auth.users (email) values ('x@exemple.fr')")).rejects.toThrow(/beta_invite_only/);
    await q("insert into public.beta_settings (id, invite_only) values (true, false)");
    await q("insert into auth.users (email) values ('x@exemple.fr')");
    await q("update public.beta_settings set invite_only = true");
  });

  it("la liste d'invitation et le réglage sont inaccessibles aux visiteurs et aux membres", async () => {
    const u = await createUser(db);
    for (const uid of [null, u]) {
      await expect(asUser(db, uid, () => q("select * from public.beta_allowlist"))).rejects.toThrow(/permission denied/);
      await expect(asUser(db, uid, () => q("insert into public.beta_allowlist (email) values ('pirate@exemple.fr')"))).rejects.toThrow(/permission denied/);
      await expect(asUser(db, uid, () => q("update public.beta_settings set invite_only = false"))).rejects.toThrow(/permission denied/);
      await expect(asUser(db, uid, () => q("select public.beta_email_allowed('testeur.a@exemple.fr')"))).rejects.toThrow(/permission denied/);
    }
  });

  it("un visiteur non connecté ne lit aucune donnée métier avec la clé publique", async () => {
    await createUser(db);
    for (const table of ["profiles", "listings", "messages", "matches", "groups", "cities", "reports"]) {
      await expect(asUser(db, null, () => q(`select * from public.${table} limit 1`))).rejects.toThrow(/permission denied/);
    }
    await expect(asUser(db, null, () => q("select public.my_conversations()"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, null, () => q("select public.swipe(gen_random_uuid(), true)"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, null, () => q("select name from storage.objects"))).rejects.toThrow(/permission denied/);
  });
});
