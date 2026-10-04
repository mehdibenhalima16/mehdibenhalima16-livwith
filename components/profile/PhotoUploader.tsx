/* eslint-disable @next/next/no-img-element */
"use client";
import { useRef, useState } from "react";
import { Camera, Trash2, Star } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";

export interface UploadedPhoto { path: string; url: string }

/** Envoi direct navigateur → Storage (dossier de l'utilisateur, contrôlé par les politiques RLS). */
export function PhotoUploader({
  userId, bucket, value, onChange, max, prefix = "",
}: {
  userId: string; bucket: "avatars" | "listing-photos"; value: UploadedPhoto[]; onChange: (v: UploadedPhoto[]) => void; max: number; prefix?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const supabase = getBrowserClient();
    const next = [...value];
    for (const file of Array.from(files).slice(0, max - value.length)) {
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error("Image trop lourde (20 Mo maximum).");
        const blob = await compressImage(file);
        const path = `${userId}/${prefix}${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw new Error("Envoi impossible. Réessaie.");
        next.push({ path, url: URL.createObjectURL(blob) });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Envoi impossible.");
      }
    }
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function remove(p: UploadedPhoto) {
    onChange(value.filter((x) => x.path !== p.path));
    await getBrowserClient().storage.from(bucket).remove([p.path]);
  }

  const makeFirst = (p: UploadedPhoto) => onChange([p, ...value.filter((x) => x.path !== p.path)]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {value.map((p, i) => (
          <div key={p.path} className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-plaster">
            <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-door px-2 py-0.5 text-[11px] font-bold text-white">Principale</span>}
            <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5">
              {i > 0 && <button type="button" onClick={() => makeFirst(p)} aria-label="Mettre en photo principale" className="rounded-full bg-paper/90 p-1.5"><Star className="h-4 w-4" /></button>}
              <button type="button" onClick={() => remove(p)} aria-label="Supprimer la photo" className="rounded-full bg-paper/90 p-1.5 text-alert"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {value.length < max && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-door/50 bg-paper text-sm font-semibold text-door hover:bg-door/5">
            <Camera className="h-6 w-6" aria-hidden />{busy ? "Envoi…" : "Ajouter"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={(e) => add(e.target.files)} />
      <p className="mt-2 text-xs text-muted">{value.length}/{max} photos. Recompressées et sans données de localisation avant l&apos;envoi.</p>
      {error && <p role="alert" className="mt-1 text-sm text-alert">{error}</p>}
    </div>
  );
}
