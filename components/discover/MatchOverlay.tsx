"use client";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/Button";
import Link from "next/link";

/** Le moment du match : deux noms qui se posent sur la même boîte aux lettres. */
export function MatchOverlay({ me, them, conversationId, onClose }: { me: string; them: string; conversationId?: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="match-title" ref={ref} tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-door-deep/92 px-6 outline-none">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-64 rounded-2xl border border-[#c9ccc3] bg-gradient-to-b from-[#eceee9] to-[#d9dcd4] p-5">
          <div className="mx-auto mb-4 h-2 w-24 rounded-full bg-[#1f2a25]" aria-hidden />
          <div className="flex flex-col items-center gap-2">
            <span className="tape anim-left text-lg">{me}</span>
            <span className="tape tape-blush anim-right text-lg">{them}</span>
          </div>
        </div>
        <h2 id="match-title" className="anim-rise mt-8 font-display text-4xl font-extrabold text-white">C&apos;est un match</h2>
        <p className="anim-rise mt-2 text-white/80">{them} t&apos;a choisi·e aussi. Présentez-vous, parlez rythme et ménage, puis organisez une visite.</p>
        <div className="anim-rise mt-8 flex flex-col gap-3">
          {conversationId && <Link href={`/messages/${conversationId}`} className={buttonClass("blush", "lg")}>Écrire à {them}</Link>}
          <button type="button" onClick={onClose} className="text-sm font-semibold text-white/80 hover:text-white">Continuer à découvrir</button>
        </div>
      </div>
    </div>
  );
}
