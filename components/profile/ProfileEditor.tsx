"use client";
import { useState, useTransition } from "react";
import { updateBasics, updateQuestionnaire } from "@/lib/actions/profile";
import { LIMITS, HOUSEHOLD_PREFS } from "@/lib/config";
import { DIMENSIONS, type Lifestyle, type Preferences } from "@/lib/lifestyle";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Input, Notice } from "@/components/ui/Field";
import { BasicsFields, IntentPicker, type Basics } from "./BasicsFields";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";
import { QuestionStep, type QuestionnaireValue } from "./Questionnaire";

export function ProfileEditor({ userId, initial, photos: initialPhotos }: { userId: string; initial: Basics; photos: UploadedPhoto[] }) {
  const [basics, setBasics] = useState(initial);
  const [photos, setPhotos] = useState(initialPhotos);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <div className="space-y-2"><p className="text-sm font-semibold">Photos</p><PhotoUploader userId={userId} bucket="avatars" value={photos} onChange={setPhotos} max={LIMITS.profilePhotos} /></div>
      <div className="space-y-2"><p className="text-sm font-semibold">Ce que tu cherches</p><IntentPicker value={basics.intents} onChange={(intents) => setBasics({ ...basics, intents })} /></div>
      <BasicsFields value={basics} onChange={setBasics} />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button disabled={pending} onClick={() => start(async () => {
        const r = await updateBasics({ ...basics, photos: photos.map((p) => p.path) });
        setMsg(r.error ? { tone: "error", text: r.error } : { tone: "success", text: "Profil enregistré." });
      })}>Enregistrer</Button>
    </div>
  );
}

export function QuestionnaireEditor({ lifestyle, preferences, extra }: {
  lifestyle: Lifestyle; preferences: Preferences; extra: { age_min: number; age_max: number; household_pref: "any" | "women" | "men" };
}) {
  const [q, setQ] = useState<QuestionnaireValue>({ lifestyle, preferences });
  const [x, setX] = useState(extra);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-10">
      {DIMENSIONS.map((d) => <div key={d} className="rounded-[var(--radius-panel)] border border-line bg-paper p-5"><QuestionStep dim={d} value={q} onChange={setQ} /></div>)}
      <div className="space-y-4 rounded-[var(--radius-panel)] border border-line bg-paper p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Âge minimum" htmlFor="amin"><Input id="amin" type="number" min={18} max={99} value={x.age_min} onChange={(e) => setX({ ...x, age_min: Number(e.target.value) })} /></Field>
          <Field label="Âge maximum" htmlFor="amax"><Input id="amax" type="number" min={18} max={99} value={x.age_max} onChange={(e) => setX({ ...x, age_max: Number(e.target.value) })} /></Field>
        </div>
        <div className="flex flex-wrap gap-2">{HOUSEHOLD_PREFS.map((h) => <Chip key={h.value} selected={x.household_pref === h.value} onClick={() => setX({ ...x, household_pref: h.value })}>{h.label}</Chip>)}</div>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="sticky bottom-20 md:bottom-4">
        <Button className="w-full" disabled={pending} onClick={() => start(async () => {
          const r = await updateQuestionnaire({ lifestyle: q.lifestyle, preferences: q.preferences, extra: x });
          setMsg(r.error ? { tone: "error", text: r.error } : { tone: "success", text: "Critères enregistrés. La découverte en tient compte immédiatement." });
        })}>Enregistrer mes critères</Button>
      </div>
    </div>
  );
}
