"use client";
import { CITIES, GENDERS, INTENTS } from "@/lib/config";
import { Chip, Field, Input, Select, Textarea } from "@/components/ui/Field";

export interface Basics {
  first_name: string; gender: "woman" | "man" | "nonbinary" | null; occupation: string; bio: string; city: string;
  budget_min: number; budget_max: number; move_in_date: string; intents: ("room" | "host" | "team")[];
}

export function IntentPicker({ value, onChange }: { value: Basics["intents"]; onChange: (v: Basics["intents"]) => void }) {
  return (
    <div className="grid gap-2">
      {INTENTS.map((i) => {
        const on = value.includes(i.value);
        return (
          <button key={i.value} type="button" aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== i.value) : [...value, i.value])}
            className={`rounded-2xl border px-4 py-4 text-left transition-colors ${on ? "border-door bg-door text-white" : "border-line bg-paper hover:border-door"}`}>
            <span className="font-semibold">{i.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function BasicsFields({ value, onChange, withBio = true }: { value: Basics; onChange: (v: Basics) => void; withBio?: boolean }) {
  const set = <K extends keyof Basics>(k: K, v: Basics[K]) => onChange({ ...value, [k]: v });
  const host = value.intents.includes("host") && value.intents.length === 1;
  return (
    <div className="space-y-4">
      <Field label="Prénom" htmlFor="first_name"><Input id="first_name" value={value.first_name} maxLength={40} onChange={(e) => set("first_name", e.target.value)} autoComplete="given-name" /></Field>
      <Field label="Ville" htmlFor="city">
        <Select id="city" value={value.city} onChange={(e) => set("city", e.target.value)}>
          {CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={host ? "Loyer min. (€/mois)" : "Budget min. (€/mois)"} htmlFor="bmin">
          <Input id="bmin" type="number" inputMode="numeric" min={100} max={5000} value={value.budget_min} onChange={(e) => set("budget_min", Number(e.target.value))} />
        </Field>
        <Field label={host ? "Loyer max. (€/mois)" : "Budget max. (€/mois)"} htmlFor="bmax">
          <Input id="bmax" type="number" inputMode="numeric" min={100} max={5000} value={value.budget_max} onChange={(e) => set("budget_max", Number(e.target.value))} />
        </Field>
      </div>
      <Field label={host ? "Chambre disponible à partir du" : "Date d'emménagement souhaitée"} htmlFor="move" hint="Tu verras les personnes à 60 jours près.">
        <Input id="move" type="date" value={value.move_in_date} onChange={(e) => set("move_in_date", e.target.value)} />
      </Field>
      <Field label="Activité (facultatif)" htmlFor="occ"><Input id="occ" value={value.occupation} maxLength={60} placeholder="Étudiante en master, infirmier, développeuse…" onChange={(e) => set("occupation", e.target.value)} /></Field>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">Genre (facultatif)</p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => <Chip key={g.value} selected={value.gender === g.value} onClick={() => set("gender", value.gender === g.value ? null : g.value)}>{g.label}</Chip>)}
        </div>
        <p className="text-xs text-muted">Utile seulement si toi ou d&apos;autres cherchez un foyer non mixte.</p>
      </div>
      {withBio && (
        <Field label="Présente-toi" htmlFor="bio" hint={`${value.bio.length}/600. Ce que tu fais, ce que tu aimes à la maison, ce que tu cherches.`}>
          <Textarea id="bio" value={value.bio} maxLength={600} onChange={(e) => set("bio", e.target.value)} />
        </Field>
      )}
    </div>
  );
}
