"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "./constants";

const INTENTS = ["School Booking", "Campus Booking", "Mega Event", "Sponsorship", "Partnership", "Media", "Join the Crew", "Other"];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState(INTENTS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendIt() {
    if (!name.trim() || !message.trim()) {
      setError("Give us at least your name and a message, gang.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, org, email, phone, intent, message }),
      });
      if (!res.ok) throw new Error("post failed");
      setSent(true);
    } catch {
      // never lose the message: fall back to an email draft
      const subject = encodeURIComponent(`[UGT Website] ${intent} - ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nOrganisation: ${org || "-"}\nEmail: ${email || "-"}\nPhone/WhatsApp: ${phone || "-"}\nReaching out about: ${intent}\n\n${message}`
      );
      window.open(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`, "_blank");
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setSent(false);
    setName("");
    setOrg("");
    setEmail("");
    setPhone("");
    setMessage("");
    setIntent(INTENTS[0]);
  }

  if (sent) {
    return (
      <div className="rounded-2xl border-[3px] border-ink bg-white p-9 text-center shadow-[6px_6px_0_#111] sm:p-14">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-ink bg-magenta text-[38px] text-white">✓</div>
        <div className="mt-4.5 font-display text-3xl uppercase">Welcome to the gang.</div>
        <p className="mx-auto mt-3 max-w-sm font-medium text-ink/70">
          Your email draft is open and ready to send. We reply within 48 hours.
        </p>
        <button onClick={resetForm} className="mt-5 rounded-full border-2 border-ink px-6 py-3 text-[13.5px] font-bold">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-[3px] border-ink bg-white p-7 shadow-[8px_8px_0_#111] sm:p-9">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border-2 border-ink px-4 py-3 text-[14.5px] outline-none focus:border-magenta" />
          </Field>
          <Field label="Organisation">
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="School / brand / event" className="w-full rounded-lg border-2 border-ink px-4 py-3 text-[14.5px] outline-none focus:border-magenta" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-lg border-2 border-ink px-4 py-3 text-[14.5px] outline-none focus:border-magenta" />
          </Field>
          <Field label="WhatsApp">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Best number to reach you" className="w-full rounded-lg border-2 border-ink px-4 py-3 text-[14.5px] outline-none focus:border-magenta" />
          </Field>
        </div>
        <div>
          <div className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-ink/65">I am reaching out about</div>
          <div className="flex flex-wrap gap-2">
            {INTENTS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIntent(i)}
                className={`rounded-full border-2 border-ink px-4 py-2 text-[12.5px] font-semibold ${intent === i ? "bg-magenta text-white" : "bg-white"}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <Field label="Message">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us the date, the ground, and the vision." rows={4} className="w-full resize-y rounded-lg border-2 border-ink px-4 py-3 text-[14.5px] outline-none focus:border-magenta" />
        </Field>
        {error && <div className="text-[13.5px] font-semibold text-magenta">{error}</div>}
        <button onClick={sendIt} disabled={sending} className="rounded-xl border-[3px] border-ink bg-magenta py-4 font-display text-[18px] uppercase text-white shadow-[5px_5px_0_#111] transition-transform duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111] disabled:opacity-60">
          {sending ? "SENDING…" : "SEND IT"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-bold uppercase tracking-wide text-ink/65">{label}</div>
      {children}
    </div>
  );
}
