// Le panneau d'interphone : chaque étiquette est un foyer ; celle qui s'allume, c'est le match.
const ROWS = [
  ["Inès & Tom", "Karim"],
  ["Léa", "Sofia & Yanis"],
  ["Hugo", "Camille"],
  ["Nour & Maël", "Toi ?"],
];

export function Intercom() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] rounded-[var(--radius-card)] border border-[#c9ccc3] bg-gradient-to-b from-[#e9ebe6] to-[#d9dcd4] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-10 w-20 rounded-lg bg-[#1f2a25] shadow-[inset_0_2px_6px_rgb(0_0_0/0.6)]" aria-hidden>
          <div className="grid h-full grid-cols-6 gap-1 p-2">{Array.from({ length: 12 }, (_, i) => <span key={i} className="rounded-full bg-[#3a4640]" />)}</div>
        </div>
        <span className="font-display text-xs font-semibold tracking-wide text-muted">12 rue des Colocs</span>
      </div>
      <ul className="space-y-2.5">
        {ROWS.map((row, r) => (
          <li key={r} className="grid grid-cols-2 gap-2.5">
            {row.map((name) => {
              const lit = name === "Toi ?";
              return (
                <div key={name} className={`flex items-center gap-2 rounded-lg border border-[#c3c7bd] bg-[#f4f5f1] px-2 py-2 ${lit ? "anim-glow" : ""}`}>
                  <span aria-hidden className={`h-5 w-5 shrink-0 rounded-full border ${lit ? "border-amber bg-amber" : "border-[#b5b9ae] bg-[#e3e5df]"}`} />
                  <span className={`tape truncate text-[11px] ${lit ? "tape-blush" : ""}`}>{name}</span>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
