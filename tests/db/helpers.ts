import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Base PostgreSQL locale (voir scripts/pg-local.sh). Surchargeable via TEST_DATABASE_URL_ADMIN.
const ADMIN_URL = process.env.TEST_DATABASE_URL_ADMIN ?? "postgres://postgres@localhost:54329/postgres?host=/tmp";

export async function freshDatabase(name: string) {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  await admin.end();
  const url = ADMIN_URL.replace(/\/postgres(\?|$)/, `/${name}$1`);
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query("set client_min_messages = error");
  const root = join(__dirname, "..", "..", "supabase");
  await db.query(readFileSync(join(root, "tests", "supabase_stubs.sql"), "utf8"));
  for (const file of readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(join(root, "migrations", file), "utf8"));
  }
  return db;
}

/** Exécute `fn` dans une transaction avec le rôle et le JWT d'un utilisateur (null = anon). */
export async function asUser<T>(db: pg.Client, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
    ]);
    const out = await fn();
    await db.query("commit");
    return out;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

export const DIMS = ["cleanliness", "schedule", "quiet", "social", "guests", "remote", "smoking", "pets", "sharing", "duration"] as const;
export const MAX: Record<string, number> = { smoking: 3, pets: 4 };

export function lifestyle(overrides: Record<string, number> = {}) {
  const l: Record<string, number> = {};
  for (const d of DIMS) l[d] = d === "smoking" || d === "pets" ? 1 : 3;
  return { ...l, ...overrides };
}

export function preferences(overrides: Record<string, { accept: number[]; importance: number }> = {}) {
  const p: Record<string, { accept: number[]; importance: number }> = {};
  for (const d of DIMS) {
    const max = MAX[d] ?? 5;
    p[d] = { accept: Array.from({ length: max }, (_, i) => i + 1), importance: 1 };
  }
  return { ...p, ...overrides };
}

export interface UserOpts {
  firstName?: string;
  city?: string;
  intents?: string[];
  budget?: [number, number];
  moveIn?: string;
  birth?: string;
  lifestyle?: Record<string, number>;
  preferences?: Record<string, { accept: number[]; importance: number }>;
  gender?: string | null;
  householdPref?: string;
}

export async function createUser(db: pg.Client, opts: UserOpts = {}) {
  const id = randomUUID();
  await db.query("insert into public.beta_allowlist (email) values ($1)", [`${id}@test.local`]);
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.local`]);
  await asUser(db, id, () =>
    db.query(
      `select public.save_onboarding($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        opts.firstName ?? "Test", opts.gender ?? null, "Étudiant", "Bonjour", opts.city ?? "paris",
        opts.budget?.[0] ?? 600, opts.budget?.[1] ?? 900, opts.moveIn ?? "2026-11-01", opts.intents ?? ["team"], [],
        JSON.stringify(opts.lifestyle ?? lifestyle()), JSON.stringify(opts.preferences ?? preferences()),
        opts.birth ?? "1999-05-01", 18, 99, opts.householdPref ?? "any", new Date().toISOString(),
      ],
    ),
  );
  return id;
}
