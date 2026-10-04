"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { clock, dbErrorMessage } from "@/lib/format";
import { ReportButton } from "@/components/safety/SafetyActions";

export interface ChatMessage { id: number; sender_id: string | null; body: string; flagged: boolean; created_at: string }

export function ChatRoom({
  conversationId, me, initial, names, closed, otherLastRead,
}: {
  conversationId: string; me: string; initial: ChatMessage[]; names: Record<string, string>; closed: boolean; otherLastRead: string | null;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastRead, setLastRead] = useState(otherLastRead);
  const bottom = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  useEffect(() => {
    const supabase = getBrowserClient();
    const markRead = () =>
      supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", me).then(() => undefined);
    markRead();
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: { new: unknown }) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== me) markRead();
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${conversationId}` },
        (payload: { new: unknown }) => {
          const p = payload.new as { user_id: string; last_read_at: string };
          if (p.user_id !== me) setLastRead(p.last_read_at);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, me]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await getBrowserClient()
      .from("messages").insert({ conversation_id: conversationId, body }).select("id, sender_id, body, flagged, created_at").single();
    setSending(false);
    if (err) return setError(dbErrorMessage(err.message));
    setText("");
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as ChatMessage]));
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === me);
  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[420px] flex-col md:h-[calc(100dvh-190px)]">
      <div className="flex-1 space-y-2 overflow-y-auto py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="mx-auto max-w-sm rounded-2xl bg-paper px-4 py-3 text-center text-sm text-muted">
            Lance la conversation : présente-toi, parle de ton rythme, de ce que tu cherches. Proposez une visite en visio ou en vrai.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && Object.keys(names).length > 1 && <span className="mb-0.5 px-2 text-xs text-muted">{m.sender_id ? names[m.sender_id] ?? "Membre" : "Compte supprimé"}</span>}
              <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] ${mine ? "rounded-br-md bg-door text-white" : "rounded-bl-md border border-line bg-paper"}`}>
                {m.body}
              </div>
              {m.flagged && !mine && (
                <div className="mt-1 flex max-w-[80%] items-start gap-2 rounded-2xl bg-amber-soft px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>Ce message contient des éléments fréquents dans les arnaques (paiement avant visite, clés envoyées par courrier…). Ne verse jamais d&apos;argent avant d&apos;avoir visité et signé. <ReportButton kind="message" id={String(m.id)} compact /></span>
                </div>
              )}
              <span className="mt-0.5 px-2 text-[11px] text-muted">
                {clock(m.created_at)}
                {mine && m.id === lastMine?.id && lastRead && lastRead >= m.created_at ? " · Vu" : ""}
              </span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {closed ? (
        <p className="rounded-2xl bg-paper px-4 py-3 text-center text-sm text-muted">Cette conversation est fermée.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-line pt-3">
          <label htmlFor="msg" className="sr-only">Message</label>
          <textarea id="msg" value={text} rows={1} maxLength={2000} placeholder="Écris un message…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-line bg-paper px-4 py-3 text-[15px] focus:border-door focus:outline-none" />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Envoyer" className="flex h-12 w-12 items-center justify-center rounded-full bg-door text-white disabled:opacity-40">
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}
