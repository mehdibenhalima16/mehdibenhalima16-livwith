/* eslint-disable @next/next/no-img-element */
const TINTS = ["bg-blush text-door-deep", "bg-door text-white", "bg-amber-soft text-ink", "bg-[#dfe8e2] text-door-deep"];

export function Avatar({ src, name, size = 48, className = "" }: { src?: string | null; name: string; size?: number; className?: string }) {
  const tint = TINTS[(name.charCodeAt(0) || 0) % TINTS.length];
  const style = { width: size, height: size };
  if (src) return <img src={src} alt="" style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span aria-hidden style={style} className={`shrink-0 inline-flex items-center justify-center rounded-full font-display font-bold ${tint} ${className}`}>
      <span style={{ fontSize: size * 0.42 }}>{name.slice(0, 1).toUpperCase()}</span>
    </span>
  );
}

export function DemoBadge() {
  return <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-bold text-ink" title="Profil fictif créé pour la démonstration">Démo</span>;
}
