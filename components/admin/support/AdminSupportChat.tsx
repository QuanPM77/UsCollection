"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Send, X } from "lucide-react";

type ChatMessage = { id: string; senderRole: string; body: string; createdAt: string };
type Conversation = {
  id: string;
  updatedAt: string;
  customer: { fullName: string | null; email: string | null; phone: string | null };
  messages: Array<{ body: string; senderRole: string; createdAt: string }>;
  unreadCount: number;
};

function customerName(customer: Conversation["customer"]) {
  return customer.fullName || customer.email || customer.phone || "Khách hàng";
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function AdminSupportChat() {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadConversations, setUnreadConversations] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Pick<Conversation, "id" | "customer"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/support-chat", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không tải được danh sách trò chuyện.");
      setConversations(data.conversations as Conversation[]);
      setUnreadConversations(Number(data.unreadConversations) || 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được danh sách trò chuyện.");
    }
  }, []);

  useEffect(() => {
    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 5000);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

  useEffect(() => {
    if (!open || !selectedId) return;
    let active = true;
    const loadMessages = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetch(`/api/admin/support-chat/${encodeURIComponent(selectedId)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Không tải được nội dung trò chuyện.");
        if (active) {
          setSelectedConversation(data.conversation as Pick<Conversation, "id" | "customer">);
          setMessages(data.messages as ChatMessage[]);
          setError("");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được nội dung trò chuyện.");
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };
    void loadMessages(true);
    const timer = window.setInterval(() => void loadMessages(false), 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, selectedId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  function selectConversation(id: string) {
    setMessages([]);
    setSelectedConversation(null);
    setSelectedId(id);
    setError("");
    setLoading(true);
  }

  async function sendReply(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/support-chat/${encodeURIComponent(selectedId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không gửi được phản hồi.");
      setMessages((current) => [...current, data.message as ChatMessage]);
      setDraft("");
      void loadInbox();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được phản hồi.");
    } finally { setSending(false); }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendReply();
    }
  }

  return <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3">
    {open && <section aria-label="Hộp thư trò chuyện với khách" className="flex h-[min(38rem,calc(100dvh-7rem))] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-pink-mid/40 bg-white shadow-2xl sm:w-[390px]">
      <header className="flex min-h-[68px] items-center gap-2 bg-pink-deep px-3 py-3 text-white">
        {selectedId && <button type="button" aria-label="Quay lại danh sách" onClick={() => { setSelectedId(null); setSelectedConversation(null); setMessages([]); setError(""); }} className="rounded-full p-2 transition hover:bg-white/15"><ArrowLeft size={19} /></button>}
        <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{selectedConversation ? customerName(selectedConversation.customer) : "Trò chuyện với khách"}</h2><p className="mt-0.5 truncate text-xs text-white/75">{selectedConversation ? selectedConversation.customer?.email || selectedConversation.customer?.phone || "Khách chưa đăng nhập" : "Hộp thư hỗ trợ khách hàng"}</p></div>
        <button type="button" aria-label="Đóng hộp thư" onClick={() => setOpen(false)} className="rounded-full p-2 transition hover:bg-white/15"><X size={18} /></button>
      </header>

      {!selectedId ? <div className="flex-1 overflow-y-auto bg-[#fff9fb] p-3">
        {conversations.length === 0 ? <div className="flex h-full flex-col items-center justify-center px-8 text-center text-sm text-pink-text/55"><MessageCircle size={34} className="mb-3 text-pink-mid" /><p>Chưa có cuộc trò chuyện nào.</p></div> : <div className="space-y-2.5">{conversations.map((conversation) => {
          const latest = conversation.messages[0];
          return <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left shadow-sm transition hover:border-pink-mid hover:bg-pink-light/50 ${conversation.unreadCount > 0 ? "border-pink-mid/70 bg-white" : "border-pink-mid/25 bg-white/75"}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold ${conversation.unreadCount > 0 ? "bg-pink-deep text-white" : "bg-pink-light text-pink-deep"}`}>{customerName(conversation.customer).slice(0, 1).toLocaleUpperCase("vi")}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-pink-text">{customerName(conversation.customer)}</strong><span className="flex shrink-0 items-center gap-2">{conversation.unreadCount > 0 && <span className="rounded-full bg-pink-deep px-2 py-0.5 text-[10px] font-semibold text-white">Chưa đọc</span>}{latest && <time className="text-[10px] text-pink-text/50">{shortTime(latest.createdAt)}</time>}</span></span>
              <span className="mt-1 block truncate text-[11px] text-pink-text/50">{conversation.customer.email || conversation.customer.phone || "Chưa cung cấp thông tin liên hệ"}</span>
              <span className="mt-2 flex items-center gap-2 rounded-lg bg-pink-light/45 px-2.5 py-2"><span className="shrink-0 text-[11px] font-semibold text-pink-deep">{latest?.senderRole === "admin" ? "Shop" : "Khách"}</span><span className="min-w-0 flex-1 truncate text-xs text-pink-text/70">{latest?.body || "Chưa có nội dung"}</span>{conversation.unreadCount > 0 && <span aria-label={`${conversation.unreadCount} tin nhắn chưa đọc`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>}</span>
            </span>
          </button>;
        })}</div>}
      </div> : <>
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#fff9fb] p-4">
          {loading && messages.length === 0 && <p className="text-center text-xs text-pink-text/50">Đang tải tin nhắn...</p>}
          {messages.map((message) => <div key={message.id} className={`flex ${message.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${message.senderRole === "admin" ? "rounded-br-sm bg-pink-deep text-white" : "rounded-tl-sm border border-pink-mid/25 bg-white text-pink-text"}`}>
              <p className="whitespace-pre-wrap break-words">{message.body}</p><time className={`mt-1 block text-right text-[10px] ${message.senderRole === "admin" ? "text-white/70" : "text-pink-text/45"}`}>{shortTime(message.createdAt)}</time>
            </div>
          </div>)}
          <div ref={bottomRef} />
        </div>
        {error && <p role="alert" className="px-4 pt-2 text-xs text-red-600">{error}</p>}
        <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-pink-mid/25 bg-white p-3">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} maxLength={2000} rows={1} placeholder="Nhập phản hồi..." aria-label="Phản hồi khách hàng" className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-pink-mid/35 px-3 py-2.5 text-sm text-pink-text outline-none focus:border-pink-deep" />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Gửi phản hồi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-deep text-white transition hover:bg-pink-text disabled:cursor-not-allowed disabled:opacity-45"><Send size={17} /></button>
        </form>
      </>}
      {error && !selectedId && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}
    </section>}
    <button type="button" aria-label={open ? "Đóng trò chuyện" : "Mở trò chuyện với khách"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative flex h-14 w-14 items-center justify-center rounded-full bg-pink-deep text-white shadow-lg transition hover:scale-105 hover:bg-pink-text focus:outline-none focus:ring-4 focus:ring-pink-mid/40">
      {open ? <X size={23} /> : <MessageCircle size={24} />}
      {!open && unreadConversations > 0 && <span aria-label={`${unreadConversations} cuộc trò chuyện chưa đọc`} className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold text-white">{unreadConversations > 99 ? "99+" : unreadConversations}</span>}
    </button>
  </div>;
}
