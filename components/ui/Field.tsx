import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "w-full rounded-2xl border border-line bg-paper px-4 h-12 text-[15px] text-ink placeholder:text-muted/70 focus:border-door focus:outline-none";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const Input = (props: ComponentProps<"input">) => <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
export const Select = (props: ComponentProps<"select">) => <select {...props} className={`${inputClass} appearance-none ${props.className ?? ""}`} />;
export const Textarea = (props: ComponentProps<"textarea">) => (
  <textarea {...props} className={`${inputClass} h-auto min-h-28 py-3 leading-relaxed ${props.className ?? ""}`} />
);

export function Chip({ selected, children, ...props }: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected ? "border-door bg-door text-white" : "border-line bg-paper text-ink hover:border-door"
      } ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const tones = {
    info: "bg-paper border-line text-ink",
    error: "bg-alert-soft border-alert/30 text-alert",
    success: "bg-door/8 border-door/25 text-door-deep",
    warning: "bg-amber-soft border-amber text-ink",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}
