#!/usr/bin/env node
// Crée des profils et annonces FICTIFS (is_demo = true, badge « Démo ») pour tester la découverte.
// Usage : node --env-file=.env.local scripts/seed-demo.mjs [--city=paris] [--clean]
// Nécessite SUPABASE_SERVICE_ROLE_KEY. Ne jamais lancer en production ouverte au public sans les supprimer ensuite.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis"); process.exit(1); }
const admin = createClient(url, key, { auth: { persistSession: false } });
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const city = args.city ?? "paris";
const DOMAIN = "demo.livwith.invalid";

async function clean() {
  let page = 1;
  for (;;) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const demo = (data?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMAIN}`));
    for (const u of demo) {
      const { data: files } = await admin.storage.from("avatars").list(u.id);
      if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${u.id}/${f.name}`));
      const { data: lf } = await admin.storage.from("listing-photos").list(u.id);
      if (lf?.length) await admin.storage.from("listing-photos").remove(lf.map((f) => `${u.id}/${f.name}`));
      await admin.auth.admin.deleteUser(u.id);
    }
    if (!data || data.users.length < 200) break;
    page++;
  }
  console.log("Profils de démonstration supprimés.");
}

const DIMS = ["cleanliness", "schedule", "quiet", "social", "guests", "remote", "smoking", "pets", "sharing", "duration"];
const MAX = { smoking: 3, pets: 4 };
const around = (d, v) => (d === "pets" ? [1, 2, 3, 4] : Array.from({ length: MAX[d] ?? 5 }, (_, i) => i + 1).filter((x) => Math.abs(x - v) <= 1));

const PEOPLE = [
  { name: "Léa", g: "woman", job: "Étudiante en master d'urbanisme", intents: ["room", "team"], l: [4, 2, 4, 3, 2, 2, 1, 1, 3, 4], bio: "Plutôt du matin, j'aime une maison rangée et des dîners de temps en temps." },
  { name: "Karim", g: "man", job: "Infirmier", intents: ["host"], l: [3, 4, 3, 4, 4, 1, 1, 2, 4, 4], bio: "J'ai une chambre libre dans un T3. Un chat très sociable fait partie du lot." },
  { name: "Inès", g: "woman", job: "Développeuse", intents: ["team"], l: [3, 3, 3, 3, 3, 5, 1, 1, 3, 4], bio: "En télétravail, calme la journée, partante pour un grand appart à trois." },
  { name: "Tom", g: "man", job: "Graphiste freelance", intents: ["team", "room"], l: [3, 4, 2, 4, 3, 4, 2, 1, 3, 3], bio: "Musique au casque, cuisine italienne le dimanche." },
  { name: "Sofia", g: "woman", job: "Doctorante", intents: ["room"], l: [4, 2, 5, 2, 1, 3, 1, 1, 2, 5], bio: "Je cherche un endroit calme pour écrire ma thèse." },
  { name: "Yanis", g: "man", job: "Commercial", intents: ["host", "team"], l: [2, 3, 2, 5, 5, 1, 2, 3, 4, 3], bio: "Maison vivante, amis souvent là, chien adorable." },
  { name: "Camille", g: "nonbinary", job: "Chargée de production", intents: ["room", "team"], l: [3, 4, 3, 3, 3, 2, 1, 2, 3, 3], bio: "Horaires décalés quand il y a des tournages, sinon très posée." },
  { name: "Hugo", g: "man", job: "Interne en médecine", intents: ["room"], l: [4, 1, 4, 2, 2, 1, 1, 1, 2, 3], bio: "Gardes de nuit : j'ai besoin de calme pour récupérer." },
];

async function seed() {
  const move = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  for (const [i, p] of PEOPLE.entries()) {
    const email = `${p.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()}.${city}.${i}@${DOMAIN}`;
    const { data: created, error } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true });
    if (error) { console.warn(`${p.name} : ${error.message}`); continue; }
    const id = created.user.id;
    const lifestyle = Object.fromEntries(DIMS.map((d, k) => [d, p.l[k]]));
    const preferences = Object.fromEntries(DIMS.map((d, k) => [d, { accept: around(d, p.l[k]), importance: d === "smoking" ? 2 : 1 }]));
    // Pas de photo : l'interface affiche l'initiale. Ajoute des photos libres de droits si besoin.
    const { error: e1 } = await admin.from("profiles").insert({
      id, first_name: p.name, gender: p.g, occupation: p.job, bio: p.bio, city, budget_min: 450 + i * 20, budget_max: 850 + i * 20,
      move_in_date: move, intents: p.intents, photos: [], lifestyle, onboarded_at: new Date().toISOString(), is_demo: true,
    });
    const { error: e2 } = await admin.from("profiles_private").insert({
      id, birth_date: `${1994 + i}-0${(i % 9) + 1}-15`, preferences, terms_accepted_at: new Date().toISOString(),
    });
    if (e1 || e2) console.warn(p.name, e1?.message ?? e2?.message);
    else console.log(`Créé : ${p.name} (${city})`);
  }
  console.log("Terminé. Profils marqués « Démo » dans l'interface. Suppression : --clean");
}

if (args.clean) await clean(); else await seed();
