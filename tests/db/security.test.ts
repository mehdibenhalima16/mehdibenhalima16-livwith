import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asUser, createUser, freshDatabase, lifestyle, preferences } from "./helpers";

let db: pg.Client;
beforeAll(async () => { db = await freshDatabase("livwith_test"); }, 60_000);
afterAll(async () => { await db?.end(); });

const q = (sql: string, params: unknown[] = []) => db.query(sql, params);

describe("profils et données privées", () => {
  it("un visiteur non connecté ne lit aucun profil", async () => {
    await createUser(db);
    await expect(asUser(db, null, () => q("select * from public.profiles"))).rejects.toThrow(/permission denied/);
  });

  it("refuse un utilisateur mineur à l'onboarding", async () => {
    await expect(createUser(db, { birth: "2012-01-01" })).rejects.toThrow(/profiles_private_birth_date_check|check constraint/);
  });

  it("refuse un questionnaire incomplet ou hors bornes", async () => {
    await expect(createUser(db, { lifestyle: { ...lifestyle(), smoking: 4 } })).rejects.toThrow(/check constraint/);
    await expect(createUser(db, { preferences: { ...preferences(), guests: { accept: [], importance: 2 } } })).rejects.toThrow(/check constraint/);
  });

  it("expose l'âge mais jamais la date de naissance ni les préférences d'autrui", async () => {
    const a = await createUser(db, { birth: "2000-01-15" });
    const b = await createUser(db);
    const rows = await asUser(db, b, async () => (await q("select id, public.age_years(p) as age from public.profiles p where id = $1", [a])).rows);
    expect(rows[0].age).toBeGreaterThanOrEqual(26);
    const priv = await asUser(db, b, async () => (await q("select * from public.profiles_private where id = $1", [a])).rows);
    expect(priv).toHaveLength(0);
    const own = await asUser(db, a, async () => (await q("select preferences from public.profiles_private where id = $1", [a])).rows);
    expect(own).toHaveLength(1);
  });

  it("un utilisateur ne peut ni se marquer démo, ni lever une suspension, ni modifier autrui", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    await expect(asUser(db, a, () => q("update public.profiles set is_demo = true where id = $1", [a]))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, a, () => q("update public.profiles set suspended_at = null where id = $1", [a]))).rejects.toThrow(/permission denied/);
    const r = await asUser(db, a, () => q("update public.profiles set bio = 'piraté' where id = $1", [b]));
    expect(r.rowCount).toBe(0);
  });

  it("la découverte et les préférences brutes sont réservées au serveur", async () => {
    const a = await createUser(db);
    await expect(asUser(db, a, () => q("select * from public.discovery_pool($1, 10)", [a]))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, a, () => q("select * from public.compat_inputs($1)", [[a]]))).rejects.toThrow(/permission denied/);
  });
});

describe("filtres impératifs de la découverte", () => {
  it("applique ville, intentions, budget, dates, âge et critères impératifs", async () => {
    const me = await createUser(db, { city: "lyon", intents: ["room"], budget: [500, 700], moveIn: "2026-12-01" });
    const ok = await createUser(db, { city: "lyon", intents: ["host"], budget: [600, 650], moveIn: "2026-12-20", firstName: "Karim" });
    await createUser(db, { city: "paris", intents: ["host"], budget: [600, 650], moveIn: "2026-12-20" }); // autre ville
    await createUser(db, { city: "lyon", intents: ["room"], budget: [600, 650], moveIn: "2026-12-20" }); // intention incompatible
    await createUser(db, { city: "lyon", intents: ["host"], budget: [800, 950], moveIn: "2026-12-20" }); // budget disjoint
    await createUser(db, { city: "lyon", intents: ["host"], budget: [600, 650], moveIn: "2027-04-01" }); // date trop lointaine
    await createUser(db, { city: "lyon", intents: ["host"], budget: [600, 650], moveIn: "2026-12-20", lifestyle: lifestyle({ smoking: 3 }) });
    const smokerHater = { ...preferences(), smoking: { accept: [1], importance: 3 } };
    await q("update public.profiles_private set preferences = $1 where id = $2", [JSON.stringify(smokerHater), me]);
    const pool = (await q("select id from public.discovery_pool($1, 50)", [me])).rows.map((r) => r.id);
    expect(pool).toEqual([ok]);
  });

  it("respecte la préférence de foyer dans les deux sens", async () => {
    const w = await createUser(db, { city: "nantes", gender: "woman", householdPref: "women" });
    const m = await createUser(db, { city: "nantes", gender: "man" });
    const w2 = await createUser(db, { city: "nantes", gender: "woman" });
    const pool = (await q("select id from public.discovery_pool($1, 50)", [w])).rows.map((r) => r.id);
    expect(pool).toEqual([w2]);
    const poolM = (await q("select id from public.discovery_pool($1, 50)", [m])).rows.map((r) => r.id);
    expect(poolM).not.toContain(w);
  });
});

describe("likes, matchs et messagerie", () => {
  it("un like seul ne crée rien ; le like réciproque crée match et conversation", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    const r1 = await asUser(db, a, async () => (await q("select public.swipe($1, true) as r", [b])).rows[0].r);
    expect(r1.matched).toBe(false);
    const r2 = await asUser(db, b, async () => (await q("select public.swipe($1, true) as r", [a])).rows[0].r);
    expect(r2.matched).toBe(true);
    const parts = (await q("select user_id from public.conversation_participants where conversation_id = $1", [r2.conversation_id])).rows;
    expect(parts).toHaveLength(2);
  });

  it("un tiers ne lit ni n'écrit dans une conversation ; les messages suspects sont signalés", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    const c = await createUser(db);
    await asUser(db, a, () => q("select public.swipe($1, true)", [b]));
    const conv = await asUser(db, b, async () => (await q("select public.swipe($1, true) as r", [a])).rows[0].r.conversation_id);
    await asUser(db, a, () => q("insert into public.messages (conversation_id, body) values ($1, 'Salut, dispo pour une visite ?')", [conv]));
    await asUser(db, b, () => q("insert into public.messages (conversation_id, body) values ($1, 'Je suis actuellement à l''étranger, payez par Western Union avant la visite')", [conv]));
    const seen = await asUser(db, c, async () => (await q("select * from public.messages where conversation_id = $1", [conv])).rows);
    expect(seen).toHaveLength(0);
    await expect(asUser(db, c, () => q("insert into public.messages (conversation_id, body) values ($1, 'intrus')", [conv]))).rejects.toThrow(/row-level security/);
    await expect(asUser(db, a, () => q("insert into public.messages (conversation_id, body, flagged) values ($1, 'x', false)", [conv]))).rejects.toThrow(/permission denied/);
    const msgs = await asUser(db, a, async () => (await q("select body, flagged from public.messages where conversation_id = $1 order by id", [conv])).rows);
    expect(msgs.map((m) => m.flagged)).toEqual([false, true]);
    const list = await asUser(db, a, async () => (await q("select * from public.my_conversations()")).rows);
    expect(list[0].unread).toBe(1);
  });

  it("limite l'envoi à 20 messages par minute", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    await asUser(db, a, () => q("select public.swipe($1, true)", [b]));
    const conv = await asUser(db, b, async () => (await q("select public.swipe($1, true) as r", [a])).rows[0].r.conversation_id);
    for (let i = 0; i < 20; i++) {
      await asUser(db, a, () => q("insert into public.messages (conversation_id, body) values ($1, $2)", [conv, `m${i}`]));
    }
    await expect(asUser(db, a, () => q("insert into public.messages (conversation_id, body) values ($1, 'de trop')", [conv]))).rejects.toThrow(/rate_limited/);
  });

  it("le blocage supprime le match, ferme la conversation et masque le profil", async () => {
    const a = await createUser(db, { city: "rennes" });
    const b = await createUser(db, { city: "rennes" });
    await asUser(db, a, () => q("select public.swipe($1, true)", [b]));
    const conv = await asUser(db, b, async () => (await q("select public.swipe($1, true) as r", [a])).rows[0].r.conversation_id);
    await asUser(db, a, () => q("insert into public.blocks (blocked) values ($1)", [b]));
    expect((await q("select count(*)::int as n from public.matches where $1 in (user_a, user_b)", [a])).rows[0].n).toBe(0);
    await expect(asUser(db, b, () => q("insert into public.messages (conversation_id, body) values ($1, 'toujours là ?')", [conv]))).rejects.toThrow(/row-level security/);
    const vis = await asUser(db, b, async () => (await q("select id from public.profiles where id = $1", [a])).rows);
    expect(vis).toHaveLength(0);
    await expect(asUser(db, b, () => q("select public.swipe($1, true)", [a]))).rejects.toThrow(/blocked/);
  });
});

describe("annonces et modération", () => {
  const listing = (over: Record<string, unknown> = {}) => ({
    kind: "room", title: "Chambre lumineuse à Paris 11", description: "Grande chambre meublée dans un T4 calme, proche métro, colocs sympas.",
    city: "paris", rent: 750, charges: 50, available_from: "2026-11-01", photos: [] as string[], status: "published", ...over,
  });
  const insertListing = (uid: string, l: ReturnType<typeof listing>) =>
    asUser(db, uid, async () => (await q(
      `insert into public.listings (kind, title, description, city, rent, charges, available_from, photos, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, status, review_reason`,
      [l.kind, l.title, l.description, l.city, l.rent, l.charges, l.available_from, l.photos, l.status])).rows[0]);

  it("publie une annonce plausible, met en vérification un prix anormal ou un texte d'arnaque", async () => {
    const o = await createUser(db, { intents: ["host"] });
    const good = await insertListing(o, listing({ photos: [`${o}/a.jpg`] }));
    expect(good.status).toBe("published");
    const cheap = await insertListing(o, listing({ rent: 200, charges: 0, photos: [`${o}/b.jpg`] }));
    expect(cheap.status).toBe("pending_review");
    const scam = await insertListing(o, listing({ description: "Superbe chambre, je suis à l'étranger, les clés par la poste après virement.", photos: [`${o}/c.jpg`] }));
    expect(scam.status).toBe("pending_review");
  });

  it("refuse une publication sans photo, une photo d'un autre dossier et plus de 3 annonces actives", async () => {
    const o = await createUser(db, { intents: ["host"] });
    await expect(insertListing(o, listing())).rejects.toThrow(/photos_required/);
    await expect(insertListing(o, listing({ photos: ["someone-else/x.jpg"] }))).rejects.toThrow(/listing_photos_owned/);
    for (let i = 0; i < 3; i++) await insertListing(o, listing({ photos: [`${o}/${i}.jpg`] }));
    await expect(insertListing(o, listing({ photos: [`${o}/9.jpg`] }))).rejects.toThrow(/too_many_active_listings/);
  });

  it("masque une annonce après 3 signalements distincts ; le propriétaire ne peut pas la republier", async () => {
    const o = await createUser(db, { intents: ["host"] });
    const l = await insertListing(o, listing({ photos: [`${o}/a.jpg`] }));
    const others = [await createUser(db), await createUser(db), await createUser(db)];
    const visibleBefore = await asUser(db, others[0], async () => (await q("select id from public.listings where id = $1", [l.id])).rows);
    expect(visibleBefore).toHaveLength(1);
    for (const u of others) await asUser(db, u, () => q("insert into public.reports (target_listing, reason) values ($1, 'scam')", [l.id]));
    const after = (await q("select status, moderation_hold from public.listings where id = $1", [l.id])).rows[0];
    expect(after).toEqual({ status: "pending_review", moderation_hold: true });
    const visibleAfter = await asUser(db, others[0], async () => (await q("select id from public.listings where id = $1", [l.id])).rows);
    expect(visibleAfter).toHaveLength(0);
    await asUser(db, o, () => q("update public.listings set status = 'published' where id = $1", [l.id]));
    expect((await q("select status from public.listings where id = $1", [l.id])).rows[0].status).toBe("pending_review");
    await expect(asUser(db, o, () => q("update public.listings set status = 'removed' where id = $1", [l.id]))).rejects.toThrow(/invalid_status/);
  });

  it("les actions d'administration sont refusées aux utilisateurs, acceptées pour un admin", async () => {
    const o = await createUser(db, { intents: ["host"] });
    const l = await insertListing(o, listing({ rent: 100, charges: 0, photos: [`${o}/a.jpg`] }));
    const u = await createUser(db);
    await expect(asUser(db, u, () => q("select public.admin_set_listing_status($1, 'published')", [l.id]))).rejects.toThrow(/forbidden/);
    await q("insert into public.admins (user_id) values ($1)", [u]);
    await asUser(db, u, () => q("select public.admin_set_listing_status($1, 'published')", [l.id]));
    expect((await q("select status from public.listings where id = $1", [l.id])).rows[0].status).toBe("published");
  });
});

describe("groupes et stockage", () => {
  it("on n'invite que ses matchs ; l'invité qui accepte rejoint le chat du groupe", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    const stranger = await createUser(db);
    const g = await asUser(db, a, async () => (await q("select public.create_group('Les Batignolles', 'paris', 700, 3, null, '') as id")).rows[0].id);
    await expect(asUser(db, a, () => q("select public.invite_to_group($1, $2)", [g, stranger]))).rejects.toThrow(/not_a_match/);
    await asUser(db, a, () => q("select public.swipe($1, true)", [b]));
    await asUser(db, b, () => q("select public.swipe($1, true)", [a]));
    await asUser(db, a, () => q("select public.invite_to_group($1, $2)", [g, b]));
    const seen = await asUser(db, stranger, async () => (await q("select id from public.groups where id = $1", [g])).rows);
    expect(seen).toHaveLength(0);
    await asUser(db, b, () => q("select public.respond_group_invite($1, true)", [g]));
    const conv = (await q("select id from public.conversations where group_id = $1", [g])).rows[0].id;
    await asUser(db, b, () => q("insert into public.messages (conversation_id, body) values ($1, 'Hello le groupe')", [conv]));
    const n = (await q("select count(*)::int as n from public.conversation_participants where conversation_id = $1", [conv])).rows[0].n;
    expect(n).toBe(2);
  });

  it("chacun n'écrit que dans son propre dossier de photos", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    await asUser(db, a, () => q("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${a}/p.jpg`]));
    await expect(asUser(db, a, () => q("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${b}/p.jpg`]))).rejects.toThrow(/row-level security/);
    const others = await asUser(db, b, async () => (await q("select name from storage.objects where name like $1", [`${a}/%`])).rows);
    expect(others).toHaveLength(0);
  });
});

describe("signalement de message", () => {
  it("un participant signale un message ; un tiers ne peut pas", async () => {
    const a = await createUser(db);
    const b = await createUser(db);
    const c = await createUser(db);
    await asUser(db, a, () => q("select public.swipe($1, true)", [b]));
    const conv = await asUser(db, b, async () => (await q("select public.swipe($1, true) as r", [a])).rows[0].r.conversation_id);
    const mid = await asUser(db, b, async () => (await q("insert into public.messages (conversation_id, body) values ($1, 'message déplacé') returning id", [conv])).rows[0].id);
    await asUser(db, a, () => q("insert into public.reports (target_message, reason) values ($1, 'harassment')", [mid]));
    await expect(asUser(db, c, () => q("insert into public.reports (target_message, reason) values ($1, 'harassment')", [mid]))).rejects.toThrow(/row-level security/);
    await q("insert into public.admins (user_id) values ($1)", [c]);
    const adminSees = await asUser(db, c, async () => (await q("select body from public.messages where id = $1", [mid])).rows);
    expect(adminSees).toHaveLength(1);
  });
});
