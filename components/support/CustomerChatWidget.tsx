"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type ChatMessage = { id: string; senderRole: string; body: string; createdAt: string };
const GREETING = "Xin chào! UsStory có thể hỗ trợ bạn điều gì ạ?";

function messageTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function CustomerChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const response = await fetch("/api/support/chat?summary=1", { cache: "no-store" });
        const data = await response.json();
        if (response.ok && active) setUnreadCount(Number(data.unreadCount) || 0);
      } catch { /* Keep the last known badge count if the network is temporarily unavailable. */ }
    };
    void loadUnreadCount();
    const timer = window.setInterval(() => void loadUnreadCount(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadMessages = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch("/api/support/chat?read=1", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không tải được tin nhắn.");
        if (active) { setMessages(data.messages as ChatMessage[]); setUnreadCount(Number(data.unreadCount) || 0); setError(""); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được tin nhắn.");
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };
    void loadMessages(true);
    const timer = window.setInterval(() => void loadMessages(false), 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không gửi được tin nhắn.");
      setMessages((current) => [...current, data.message as ChatMessage]);
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được tin nhắn.");
    } finally { setSending(false); }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function closeWidget() {
    setOpen(false);
    if (messages.length === 0) {
      setDraft("");
      setError("");
    }
  }

  return <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3">
    {open && <section aria-label="Trò chuyện với UsStory" className="flex h-[min(36rem,calc(100dvh-7rem))] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-pink-mid/40 bg-white shadow-2xl sm:w-[380px]">
      <header className="flex items-center justify-between bg-pink-deep px-4 py-3.5 text-white">
        <div><h2 className="font-semibold">Trò chuyện với shop</h2><p className="mt-0.5 text-xs text-white/75">UsStory luôn sẵn sàng hỗ trợ bạn</p></div>
        <button type="button" aria-label="Đóng khung chat" onClick={closeWidget} className="rounded-full p-2 transition hover:bg-white/15"><X size={18} /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#fff9fb] p-4">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-pink-mid/25 bg-white px-3.5 py-2.5 text-sm text-pink-text shadow-sm">{GREETING}</div>
        {loading && messages.length === 0 && <p className="text-center text-xs text-pink-text/50">Đang tải lịch sử trò chuyện...</p>}
        {messages.map((message) => <div key={message.id} className={`flex ${message.senderRole === "customer" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${message.senderRole === "customer" ? "rounded-br-sm bg-pink-deep text-white" : "rounded-tl-sm border border-pink-mid/25 bg-white text-pink-text"}`}>
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <time className={`mt-1 block text-right text-[10px] ${message.senderRole === "customer" ? "text-white/70" : "text-pink-text/45"}`}>{messageTime(message.createdAt)}</time>
          </div>
        </div>)}
        <div ref={bottomRef} />
      </div>
      {error && <p role="alert" className="px-4 pt-2 text-xs text-red-600">{error}</p>}
      <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-pink-mid/25 bg-white p-3">
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} maxLength={2000} rows={1} placeholder="Nhập tin nhắn..." aria-label="Tin nhắn" className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-pink-mid/35 px-3 py-2.5 text-sm text-pink-text outline-none focus:border-pink-deep" />
        <button type="submit" disabled={!draft.trim() || sending || loading} aria-label="Gửi tin nhắn" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-deep text-white transition hover:bg-pink-text disabled:cursor-not-allowed disabled:opacity-45"><Send size={17} /></button>
      </form>
    </section>}
    <button type="button" aria-label={open ? "Đóng trò chuyện" : unreadCount > 0 ? `Trò chuyện với shop, ${unreadCount} tin nhắn chưa đọc` : "Trò chuyện với shop"} aria-expanded={open} onClick={() => open ? closeWidget() : setOpen(true)} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-pink-deep text-white shadow-lg transition hover:scale-105 hover:bg-pink-text focus:outline-none focus:ring-4 focus:ring-pink-mid/40">
      {open ? <X size={23} /> : <MessageCircle size={24} />}
      {!open && unreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
  </div>;
}
