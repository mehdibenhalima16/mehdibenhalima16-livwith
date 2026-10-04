"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { Notice } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AuthForm({
  action, submitLabel, children, hideOnSuccess = false,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (hideOnSuccess && state?.ok) return <Notice tone="success">{state.ok}</Notice>;
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.ok}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? "Un instant…" : submitLabel}</Button>
    </form>
  );
}
