"use client";
import { useState, useTransition } from "react";
import { AMENITIES, CITIES, LIMITS } from "@/lib/config";
import { saveListing } from "@/lib/actions/listings";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Input, Notice, Select, Textarea } from "@/components/ui/Field";
import { PhotoUploader, type UploadedPhoto } from "@/components/profile/PhotoUploader";

export interface ListingDraft {
  kind: "room" | "entire"; title: string; description: string; city: string; district: string; rent: number; charges: number;
  deposit: number | null; surface_m2: number | null; bedrooms: number | null; flatmates: number | null; furnished: boolean;
  available_from: string; min_duration_months: number | null; amenities: string[];
}

const num = (v: string) => (v === "" ? null : Number(v));

export function ListingForm({ userId, id, initial, initialPhotos }: { userId: string; id: string | null; initial: ListingDraft; initialPhotos: UploadedPhoto[] }) {
  const [v, setV] = useState(initial);
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ListingDraft>(k: K, val: ListingDraft[K]) => setV({ ...v, [k]: val });

  const submit = (publish: boolean) => start(async () => {
    setError(null);
    const r = await saveListing(id, { ...v, photos: photos.map((p) => p.path), publish });
    if (r?.error) setError(r.error);
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Chip selected={v.kind === "room"} onClick={() => set("kind", "room")}>Une chambre en coloc</Chip>
        <Chip selected={v.kind === "entire"} onClick={() => set("kind", "entire")}>Un logement entier</Chip>
      </div>
      <Field label="Titre" htmlFor="t"><Input id="t" value={v.title} maxLength={90} placeholder="Chambre de 12 m² dans un T4 lumineux, Paris 11" onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Description" htmlFor="d" hint="L'ambiance, les colocs actuels, les pièces communes, les transports. Ne donne pas l'adresse exacte : partage-la après le match.">
        <Textarea id="d" value={v.description} maxLength={3000} className="min-h-40" onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ville" htmlFor="c"><Select id="c" value={v.city} onChange={(e) => set("city", e.target.value)}>{CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select></Field>
        <Field label="Quartier (facultatif)" htmlFor="q"><Input id="q" value={v.district} maxLength={60} placeholder="Oberkampf" onChange={(e) => set("district", e.target.value)} /></Field>
        <Field label="Loyer hors charges (€/mois)" htmlFor="r"><Input id="r" type="number" min={50} value={v.rent} onChange={(e) => set("rent", Number(e.target.value))} /></Field>
        <Field label="Charges (€/mois)" htmlFor="ch"><Input id="ch" type="number" min={0} value={v.charges} onChange={(e) => set("charges", Number(e.target.value))} /></Field>
        <Field label="Dépôt de garantie (€)" htmlFor="dep"><Input id="dep" type="number" min={0} value={v.deposit ?? ""} onChange={(e) => set("deposit", num(e.target.value))} /></Field>
        <Field label={v.kind === "room" ? "Surface de la chambre (m²)" : "Surface du logement (m²)"} htmlFor="s"><Input id="s" type="number" min={5} value={v.surface_m2 ?? ""} onChange={(e) => set("surface_m2", num(e.target.value))} /></Field>
        <Field label="Chambres dans le logement" htmlFor="b"><Input id="b" type="number" min={1} value={v.bedrooms ?? ""} onChange={(e) => set("bedrooms", num(e.target.value))} /></Field>
        {v.kind === "room" && <Field label="Colocataires déjà sur place" htmlFor="f"><Input id="f" type="number" min={0} value={v.flatmates ?? ""} onChange={(e) => set("flatmates", num(e.target.value))} /></Field>}
        <Field label="Disponible à partir du" htmlFor="a"><Input id="a" type="date" value={v.available_from} onChange={(e) => set("available_from", e.target.value)} /></Field>
        <Field label="Durée minimale (mois)" htmlFor="m"><Input id="m" type="number" min={1} max={36} value={v.min_duration_months ?? ""} onChange={(e) => set("min_duration_months", num(e.target.value))} /></Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={v.furnished} onChange={(e) => set("furnished", e.target.checked)} className="h-5 w-5 accent-door" />Meublé</label>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Équipements</p>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <Chip key={a.value} selected={v.amenities.includes(a.value)}
              onClick={() => set("amenities", v.amenities.includes(a.value) ? v.amenities.filter((x) => x !== a.value) : [...v.amenities, a.value])}>{a.label}</Chip>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Photos</p>
        <PhotoUploader userId={userId} bucket="listing-photos" value={photos} onChange={setPhotos} max={LIMITS.listingPhotos} />
      </div>
      <Notice tone="info">Les annonces au prix anormalement bas ou à la formulation suspecte sont vérifiées par la modération avant d&apos;être visibles.</Notice>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" disabled={pending} onClick={() => submit(false)}>Enregistrer le brouillon</Button>
        <Button disabled={pending || photos.length === 0} onClick={() => submit(true)}>{pending ? "Enregistrement…" : "Publier l'annonce"}</Button>
      </div>
    </div>
  );
}
