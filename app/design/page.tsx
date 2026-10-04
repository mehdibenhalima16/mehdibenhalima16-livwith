import { notFound } from "next/navigation";
import { ProfileCard } from "@/components/discover/ProfileCard";
import { CompatExplainer, CompatBadge } from "@/components/compat/CompatMeter";
import { ListingCard } from "@/components/listings/ListingCard";
import { Intercom } from "@/components/brand/Intercom";
import { Button } from "@/components/ui/Button";
import { Chip, Notice } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { compatibility, publicView } from "@/lib/matching";
import { DIMENSIONS, type Lifestyle, type Preferences } from "@/lib/lifestyle";
import type { DeckCard, Listing } from "@/lib/types";

// Vitrine des composants réels avec données fictives (captures d'écran, revue design). Désactivée en production.
export const dynamic = "force-dynamic";
export const metadata = { title: "Design system", robots: { index: false } };

function person(l: Partial<Lifestyle>, p: Partial<Preferences>) {
  const lifestyle = Object.fromEntries(DIMENSIONS.map((d) => [d, d === "smoking" || d === "pets" ? 1 : 3])) as Lifestyle;
  const preferences = Object.fromEntries(DIMENSIONS.map((d) => [d, { accept: d === "smoking" || d === "pets" ? [1] : [2, 3, 4], importance: 1 }])) as Preferences;
  return { lifestyle: { ...lifestyle, ...l }, preferences: { ...preferences, ...p } };
}
const lea = person({ cleanliness: 4, guests: 2, social: 3 }, { cleanliness: { accept: [3, 4, 5], importance: 2 }, guests: { accept: [1, 2, 3], importance: 2 }, smoking: { accept: [1], importance: 3 } });
const karim = person({ cleanliness: 3, guests: 4, social: 4 }, { guests: { accept: [3, 4, 5], importance: 1 }, social: { accept: [3, 4, 5], importance: 2 } });
const photo = (hue: number) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='hsl(${hue},35%,78%)'/><stop offset='1' stop-color='hsl(${hue},30%,52%)'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><circle cx='200' cy='205' r='78' fill='hsl(${hue},25%,88%)'/><path d='M70 500c10-110 70-160 130-160s120 50 130 160z' fill='hsl(${hue},25%,88%)'/></svg>`)}`;
const room = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#e9e4da'/><rect x='250' y='40' width='110' height='150' fill='#cfe0e8'/><rect x='40' y='180' width='200' height='70' rx='8' fill='#1d4b3a'/><rect x='40' y='160' width='80' height='30' rx='6' fill='#f4cdd3'/><rect y='250' width='400' height='50' fill='#b9a58a'/></svg>")}`;

export default function DesignPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_DESIGN !== "1") notFound();
  const c = publicView(compatibility(lea, karim)!);
  const card: DeckCard = {
    id: "demo", firstName: "Karim", age: 29, occupation: "Infirmier de nuit", bio: "Calme en semaine, cuisine le dimanche. Je cherche des colocs qui aiment les dîners partagés sans y être obligés.",
    city: "lyon", budgetMin: 450, budgetMax: 600, moveInDate: "2026-11-01", intents: ["host"], photos: [photo(150)], isDemo: true, lifestyle: karim.lifestyle, compat: c,
  };
  const listing: Listing = {
    id: "demo", owner_id: "x", kind: "room", title: "Chambre de 13 m² dans un T4 lumineux, Croix-Rousse", description: "", city: "lyon", district: "Croix-Rousse",
    rent: 480, charges: 60, total_monthly: 540, deposit: 480, surface_m2: 13, bedrooms: 3, flatmates: 2, furnished: true, available_from: "2026-11-01",
    min_duration_months: 6, amenities: [], photos: [], status: "published", review_reason: null, published_at: null, created_at: "",
  };
  return (
    <main className="mx-auto max-w-6xl space-y-14 px-5 py-10">
      <section id="tokens" className="space-y-4">
        <h1 className="font-display text-4xl font-bold">Design system</h1>
        <div className="flex flex-wrap gap-3">
          {[["door", "#1d4b3a"], ["blush", "#f4cdd3"], ["plaster", "#f2f4f1"], ["ink", "#16211c"], ["amber", "#f2b84b"], ["line", "#dadcd5"]].map(([n, h]) => (
            <div key={n} className="w-28 overflow-hidden rounded-2xl border border-line bg-paper"><div className="h-16" style={{ background: h }} /><p className="px-3 py-2 text-xs"><strong>{n}</strong><br />{h}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3"><span className="tape">Livwith</span><span className="tape tape-blush">Karim</span><CompatBadge score={c.score} /><Button>Primaire</Button><Button variant="secondary">Secondaire</Button><Button variant="blush">Blush</Button><Chip selected>Sélectionné</Chip><Chip selected={false}>Option</Chip><Avatar name="Léa" /></div>
        <Notice tone="warning">Ce message contient des éléments fréquents dans les arnaques.</Notice>
      </section>
      <section id="screens" className="flex flex-wrap items-start gap-8">
        <div id="shot-card" className="w-[390px] bg-plaster p-4"><ProfileCard card={card} /></div>
        <div id="shot-compat" className="w-[390px] rounded-[var(--radius-card)] border border-line bg-paper p-5"><h2 className="mb-4 font-display text-xl font-bold">Pourquoi {c.score} % ?</h2><CompatExplainer c={c} name="Karim" /></div>
        <div id="shot-listing" className="w-[360px]"><ListingCard l={listing} cover={room} compat={c.score} /></div>
        <div id="shot-intercom" className="w-[390px] bg-plaster p-6"><Intercom /></div>
      </section>
    </main>
  );
}
