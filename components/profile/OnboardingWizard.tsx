"use client";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import { DIMENSIONS, isCompleteLifestyle, type Lifestyle, type Preferences } from "@/lib/lifestyle";
import { HOUSEHOLD_PREFS, LIMITS } from "@/lib/config";
import { completeOnboarding } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Chip, Field, Input, Notice } from "@/components/ui/Field";
import { BasicsFields, IntentPicker, type Basics } from "./BasicsFields";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";
import { QuestionStep, type QuestionnaireValue } from "./Questionnaire";

const inMonth = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

export function OnboardingWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState(0);
  const [basics, setBasics] = useState<Basics>({
    first_name: "", gender: null, occupation: "", bio: "", city: "paris", budget_min: 500, budget_max: 850, move_in_date: inMonth(), intents: [],
  });
  const [birth, setBirth] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [q, setQ] = useState<QuestionnaireValue>({ lifestyle: {}, preferences: {} });
  const [ages, setAges] = useState({ min: 18, max: 45 });
  const [household, setHousehold] = useState<"any" | "women" | "men">("any");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Étapes : 0 intention · 1 infos · 2 photos + bio · 3..12 questions · 13 préférences
  const total = 14;
  const qIndex = step - 3;
  const dim = qIndex >= 0 && qIndex < DIMENSIONS.length ? DIMENSIONS[qIndex] : null;

  const canNext =
    step === 0 ? basics.intents.length > 0 :
    step === 1 ? basics.first_name.trim().length > 0 && birth !== "" && basics.budget_min <= basics.budget_max :
    step === 2 ? photos.length > 0 :
    dim ? q.lifestyle[dim] !== undefined : true;

  function submit() {
    setError(null);
    if (!isCompleteLifestyle(q.lifestyle)) return setError("Réponds à toutes les questions.");
    start(async () => {
      const r = await completeOnboarding({
        basics: { ...basics, photos: photos.map((p) => p.path) },
        birth_date: birth,
        lifestyle: q.lifestyle as Lifestyle,
        preferences: q.preferences as Preferences,
        age_min: ages.min, age_max: ages.max, household_pref: household,
      });
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} aria-label="Étape précédente" className="rounded-full p-2 hover:bg-paper"><ArrowLeft className="h-5 w-5" /></button>}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}>
          <div className="h-full rounded-full bg-door transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-muted">{step + 1}/{total}</span>
      </div>

      {step === 0 && (
        <section>
          <h1 className="font-display text-3xl font-bold">Qu&apos;est-ce qui t&apos;amène ?</h1>
          <p className="mb-5 mt-1 text-muted">Plusieurs choix possibles. Tu pourras changer plus tard.</p>
          <IntentPicker value={basics.intents} onChange={(intents) => setBasics({ ...basics, intents })} />
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="mb-5 font-display text-3xl font-bold">Les bases</h1>
          <div className="space-y-4">
            <BasicsFields value={basics} onChange={setBasics} withBio={false} />
            <Field label="Date de naissance" htmlFor="birth" hint="Seul ton âge est affiché. Livwith est réservé aux 18 ans et plus.">
              <Input id="birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5">
          <div>
            <h1 className="font-display text-3xl font-bold">Montre-toi</h1>
            <p className="mt-1 text-muted">Au moins une photo où l&apos;on voit ton visage. Les profils avec photo reçoivent beaucoup plus de réponses.</p>
          </div>
          <PhotoUploader userId={userId} bucket="avatars" value={photos} onChange={setPhotos} max={LIMITS.profilePhotos} />
          <BasicsFieldsBio basics={basics} setBasics={setBasics} />
        </section>
      )}

      {dim && (
        <section>
          <p className="mb-2 text-sm font-semibold text-door">Question {qIndex + 1} sur 10</p>
          <QuestionStep dim={dim} value={q} onChange={setQ} />
        </section>
      )}

      {step === 13 && (
        <section className="space-y-5">
          <h1 className="font-display text-3xl font-bold">Dernières préférences</h1>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Âge minimum" htmlFor="amin"><Input id="amin" type="number" min={18} max={99} value={ages.min} onChange={(e) => setAges({ ...ages, min: Number(e.target.value) })} /></Field>
            <Field label="Âge maximum" htmlFor="amax"><Input id="amax" type="number" min={18} max={99} value={ages.max} onChange={(e) => setAges({ ...ages, max: Number(e.target.value) })} /></Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Composition du foyer</p>
            <div className="flex flex-wrap gap-2">{HOUSEHOLD_PREFS.map((h) => <Chip key={h.value} selected={household === h.value} onClick={() => setHousehold(h.value)}>{h.label}</Chip>)}</div>
            <p className="text-xs text-muted">Cette préférence s&apos;applique dans les deux sens.</p>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
        </section>
      )}

      <div className="mt-8">
        {step < 13 ? (
          <Button type="button" className="w-full" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuer</Button>
        ) : (
          <Button type="button" className="w-full" disabled={pending} onClick={submit}>{pending ? "Création du profil…" : "Voir mes profils compatibles"}</Button>
        )}
      </div>
    </div>
  );
}

function BasicsFieldsBio({ basics, setBasics }: { basics: Basics; setBasics: (b: Basics) => void }) {
  return (
    <Field label="Présente-toi" htmlFor="bio" hint={`${basics.bio.length}/600. Ce que tu fais, ce que tu aimes à la maison, ce que tu cherches.`}>
      <textarea id="bio" value={basics.bio} maxLength={600} onChange={(e) => setBasics({ ...basics, bio: e.target.value })}
        className="min-h-28 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] focus:border-door focus:outline-none" />
    </Field>
  );
}
