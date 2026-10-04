"use client";
import { useState } from "react";
import { DIMENSION_DEFS, IMPORTANCE, defaultAccept, withAlwaysAccepted, type Dim, type Importance, type Lifestyle, type Preferences } from "@/lib/lifestyle";
import { Chip } from "@/components/ui/Field";

export type QuestionnaireValue = { lifestyle: Partial<Lifestyle>; preferences: Partial<Preferences> };

/** Une question à la fois : ta réponse, ce que tu acceptes chez les autres, l'importance. */
export function QuestionStep({ dim, value, onChange }: { dim: Dim; value: QuestionnaireValue; onChange: (v: QuestionnaireValue) => void }) {
  const def = DIMENSION_DEFS.find((d) => d.key === dim)!;
  const self = value.lifestyle[dim];
  const pref = value.preferences[dim];

  const setSelf = (v: number) => {
    const touched = pref && pref.accept.join() !== defaultAccept(dim, self ?? v).join();
    onChange({
      lifestyle: { ...value.lifestyle, [dim]: v },
      preferences: { ...value.preferences, [dim]: { accept: touched ? pref!.accept : defaultAccept(dim, v), importance: pref?.importance ?? def.defaultImportance } },
    });
  };
  const toggleAccept = (v: number) => {
    if (!pref || def.alwaysAccepted?.includes(v)) return;
    const next = pref.accept.includes(v) ? pref.accept.filter((x) => x !== v) : [...pref.accept, v];
    if (next.length === 0) return;
    onChange({ ...value, preferences: { ...value.preferences, [dim]: { ...pref, accept: withAlwaysAccepted(dim, next) } } });
  };
  const setImportance = (i: Importance) => pref && onChange({ ...value, preferences: { ...value.preferences, [dim]: { ...pref, importance: i } } });

  return (
    <fieldset className="space-y-6">
      <legend className="sr-only">{def.label}</legend>
      <div>
        <p className="mb-3 font-display text-2xl font-bold leading-tight">{def.question}</p>
        <div className="grid gap-2">
          {def.options.map((o) => (
            <button key={o.value} type="button" aria-pressed={self === o.value} onClick={() => setSelf(o.value)}
              className={`rounded-2xl border px-4 py-3 text-left text-[15px] transition-colors ${self === o.value ? "border-door bg-door text-white" : "border-line bg-paper hover:border-door"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {pref && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold">{def.acceptQuestion}</p>
            <div className="flex flex-wrap gap-2">
              {def.options.map((o) => (
                <Chip key={o.value} selected={pref.accept.includes(o.value)} onClick={() => toggleAccept(o.value)} disabled={def.alwaysAccepted?.includes(o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">C&apos;est important pour toi ?</p>
            <div className="grid grid-cols-4 gap-1 rounded-full border border-line bg-paper p-1">
              {IMPORTANCE.map((i) => (
                <button key={i.value} type="button" aria-pressed={pref.importance === i.value} onClick={() => setImportance(i.value as Importance)}
                  className={`rounded-full px-2 py-2 text-xs font-semibold sm:text-sm ${pref.importance === i.value ? (i.value === 3 ? "bg-ink text-white" : "bg-door text-white") : "text-muted hover:text-ink"}`}>
                  {i.label}
                </button>
              ))}
            </div>
            {pref.importance === 3 && <p className="mt-2 text-xs text-muted">« Impératif » exclut toute personne qui ne correspond pas. À réserver à l&apos;essentiel.</p>}
          </div>
        </>
      )}
    </fieldset>
  );
}

export function useQuestionnaire(initial?: { lifestyle: Lifestyle; preferences: Preferences }) {
  return useState<QuestionnaireValue>(initial ?? { lifestyle: {}, preferences: {} });
}
