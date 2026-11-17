"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "bot" | "user"; text: string };

const QUICK_PROMPTS = [
  "How does the 6-digit relay PIN work?",
  "Type 2 vs CCS2 charging speed?",
  "How do I list my charger & earn?",
];

export default function SupportChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi! Need help finding a Type 2/CCS2 charger, unlocking via 6-digit PIN, or hosting your own charger?",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply || data.error || "Please try again in a moment." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Network hiccup—please check your connection." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[1100] font-sans">
      {open ? (
        <div className="w-[340px] sm:w-[370px] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-900">
          <div className="flex items-center justify-between bg-[#0b2447] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#19c37d]" />
              <div>
                <p className="text-sm font-bold leading-tight">ChargeShare Support</p>
                <p className="text-[11px] text-sky-200">Driver &amp; Host Assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="rounded-lg px-2 py-1 text-xs text-sky-200 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2.5 bg-slate-50 p-3.5 text-xs leading-relaxed">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-sm bg-[#0b2447] px-3.5 py-2.5 text-white"
                    : "mr-6 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700 shadow-xs"
                }
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-[11px] text-slate-400 px-1">Typing...</div>}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 pt-2.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => sendQuestion(qp)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-[#19c37d] hover:text-[#0b2447]"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex items-center gap-2 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about chargers, PIN, or hosting..."
              className="flex-1 rounded-full border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#19c37d] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-[#19c37d] px-4 py-2 text-xs font-bold text-[#0b2447] hover:bg-[#15a86b] disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 rounded-full bg-[#0b2447] px-4 py-3 text-xs font-bold text-white shadow-xl ring-1 ring-white/15 hover:bg-[#133566] transition"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#19c37d] text-[#0b2447] font-extrabold">
            ⚡
          </span>
          <span>EV Help &amp; Chat</span>
        </button>
      )}
    </div>
  );
}
