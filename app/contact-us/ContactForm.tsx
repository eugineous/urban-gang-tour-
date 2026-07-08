"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "./constants";

const INTENTS = [
  "School Booking",
  "Campus Booking",
  "Mega Event",
  "Sponsorship",
  "Partnership",
  "Media",
  "Join the Crew",
  "Other",
];

export default function ContactForm() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState(INTENTS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function sendIt() {
    if (!name.trim() || !message.trim()) {
      setError("Give us at least your name and a message, gang.");
      return;
    }
    const subject = encodeURIComponent(`[UGT Website] ${intent} - ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nOrganisation: ${org || "-"}\nEmail: ${email || "-"}\nPhone/WhatsApp: ${phone || "-"}\nReaching out about: ${intent}\n\n${message}`
    );
    window.open(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`, "_blank");
    setError("");
    setSent(true);
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
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-9 text-center sm:p-14">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-magenta/15 text-magenta-bright">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
            <path d="M20.8 8.6a5 5 0 0 0-8.5-3.6L12 5.3l-.3-.3a5 5 0 0 0-8.5 3.6c0 2.9 2.7 5.2 6.8 8.7L12 20l2-1.7c4.1-3.5 6.8-5.8 6.8-8.7z" />
          </svg>
        </div>
        <div className="mt-5 font-display text-3xl uppercase leading-tight">Welcome to the gang.</div>
        <p className="mt-3 text-[15px] leading-relaxed text-paper/65">
          Your email draft is open and ready to send. We reply within 48 hours.
        </p>
        <button
          onClick={resetForm}
          className="mt-6 rounded-full border-2 border-white/25 px-6 py-3 text-[13.5px] font-bold text-paper transition-all duration-150 ease-out hover:border-gold hover:text-gold active:scale-[0.97]"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-9">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[14.5px] text-paper outline-none transition-colors focus:border-magenta"
            />
          </Field>
          <Field label="Organisation / Institution">
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="School, brand, or company"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[14.5px] text-paper outline-none transition-colors focus:border-magenta"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[14.5px] text-paper outline-none transition-colors focus:border-magenta"
            />
          </Field>
          <Field label="Phone / WhatsApp">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[14.5px] text-paper outline-none transition-colors focus:border-magenta"
            />
          </Field>
        </div>
        <div>
          <div className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-paper/65">
            I am reaching out about
          </div>
          <div className="flex flex-wrap gap-2">
            {INTENTS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIntent(i)}
                className="rounded-full border-2 px-4 py-2 text-[13px] font-semibold text-paper transition-all duration-150 ease-out hover:border-gold active:scale-[0.97]"
                style={{
                  background: intent === i ? "#C7238E" : "rgba(255,255,255,0.05)",
                  borderColor: intent === i ? "#C7238E" : "rgba(255,255,255,0.2)",
                }}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <Field label="Message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you have in mind."
            rows={5}
            className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[14.5px] text-paper outline-none transition-colors focus:border-magenta"
          />
        </Field>
        {error && <div className="text-[13.5px] font-semibold text-red-300">{error}</div>}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={sendIt}
            className="rounded-2xl bg-magenta px-8 py-4 text-[15px] font-bold uppercase tracking-wide text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
          >
            Send it
          </button>
          <div className="text-[12.5px] text-paper/55">Opens your email app, addressed to {CONTACT_EMAIL}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-paper/65">{label}</div>
      {children}
    </div>
  );
}
