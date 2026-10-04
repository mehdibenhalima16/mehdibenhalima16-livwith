import { DEF, optionLabel, type Dim } from "@/lib/lifestyle";
import type { CompatSummary } from "@/lib/types";

/** Badge compact : le score et une précision honnête. */
export function CompatBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-full bg-door text-white ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3.5 py-1 text-sm"}`}>
      <strong className="font-display font-bold">{score} %</strong>
      <span className="opacity-80">compatibles</span>
    </span>
  );
}

/**
 * Score réciproque et part de tes propres attentes. Les attentes de l'autre personne
 * sont privées : seul leur effet global, inclus dans le score, est visible.
 */
export function TwoWayBars({ c, name }: { c: CompatSummary; name: string }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-baseline justify-between">
        <span className="text-muted">Score réciproque</span>
        <strong className="font-display text-2xl font-bold text-ink">{c.score} %</strong>
      </div>
      <div>
        <div className="mb-1 flex justify-between"><span className="text-muted">{name} face à tes attentes</span><span className="font-semibold">{c.mine} %</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-plaster"><div className="h-full rounded-full bg-door" style={{ width: `${c.mine}%` }} /></div>
      </div>
      <p className="text-muted">Les attentes de {name} comptent aussi dans le score, mais restent privées.</p>
    </div>
  );
}

/** Détail par critère : une piste de 1 à 5, ta position et la sienne. */
export function CriteriaTracks({ c, name, dims }: { c: CompatSummary; name: string; dims?: Dim[] }) {
  const rows = c.details.filter((d) => d.weightA > 0 && (!dims || dims.includes(d.dim)));
  return (
    <ul className="space-y-3">
      {rows.map((d) => {
        const def = DEF[d.dim as Dim];
        const steps = def.options.length;
        const friction = c.frictions.includes(d.dim);
        return (
          <li key={d.dim}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">{def.label}</span>
              {friction ? <span className="rounded-full bg-amber-soft px-2 py-0.5 font-semibold">Hors de tes attentes</span> : <span className="text-door">Dans tes attentes</span>}
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps}, 1fr)` }}>
              {def.options.map((o) => {
                const mine = o.value === d.aValue;
                const theirs = o.value === d.bValue;
                return (
                  <div key={o.value} className={`relative h-7 rounded-md border ${mine || theirs ? "border-door/40 bg-door/6" : "border-line bg-plaster"}`}>
                    <div className="absolute inset-0 flex items-center justify-center gap-1">
                      {mine && <span className="rounded bg-door px-1 text-[10px] font-bold text-white">toi</span>}
                      {theirs && <span className="rounded bg-blush-deep px-1 text-[10px] font-bold text-door-deep">{name.slice(0, 8)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {friction && (
              <p className="mt-1 text-xs text-muted">Toi : « {optionLabel(d.dim as Dim, d.aValue)} ». {name} : « {optionLabel(d.dim as Dim, d.bValue)} ».</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CompatExplainer({ c, name }: { c: CompatSummary; name: string }) {
  return (
    <div className="space-y-5">
      <TwoWayBars c={c} name={name} />
      {c.highlights.length > 0 && (
        <p className="text-sm"><span className="font-semibold">Correspond à tes attentes sur :</span> {c.highlights.map((h) => DEF[h as Dim].label.toLowerCase()).join(", ")}.</p>
      )}
      <CriteriaTracks c={c} name={name} />
      <p className="text-xs leading-relaxed text-muted">
        Détail affiché pour tes {c.criteriaCount} critère{c.criteriaCount > 1 ? "s" : ""} pris en compte, à partir des réponses déclarées. Ce n&apos;est pas une prédiction d&apos;entente :
        parlez des points à discuter avant de vous engager.
      </p>
    </div>
  );
}
