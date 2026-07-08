"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export interface CheckoutItem {
  kind: "ticket" | "merch";
  eventKey?: string;
  itemKey: string;
  name: string;
  priceKes?: number;
  variant?: string;
  qty?: number;
}

type Step = "phone" | "creating" | "paying" | "paid";

const CheckoutContext = createContext<{ open: (item: CheckoutItem) => void } | null>(null);

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}

async function safeJson(res: Response): Promise<{ ok: boolean; data: any }> {
  try {
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: res.ok, data: {} };
  }
}

export default function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<CheckoutItem | null>(null);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [totalKes, setTotalKes] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const open = useCallback((next: CheckoutItem) => {
    setItem(next);
    setStep("phone");
    setPhone("");
    setError("");
  }, []);

  const close = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setItem(null);
  }, []);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setStep("creating");
    setError("");

    try {
      const createRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: item.kind,
          eventKey: item.eventKey || null,
          itemKey: item.itemKey,
          qty: item.qty || 1,
          variant: item.variant || null,
          phone,
        }),
      });
      const created = await safeJson(createRes);
      if (!created.ok) throw new Error(created.data.error || "Something went wrong, try again");

      const orderId = created.data.orderId as string;
      setTotalKes(created.data.totalKes);
      setStep("paying");

      const pushRes = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const pushed = await safeJson(pushRes);
      if (!pushed.ok) throw new Error(pushed.data.error || "Couldn't start the M-Pesa prompt, try again");

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const r = await fetch(`/api/orders/${orderId}`);
          const order = await r.json();
          if (order.status === "paid") {
            if (pollRef.current) clearInterval(pollRef.current);
            if (typeof window !== "undefined" && window.gtag) {
              window.gtag("event", "purchase", {
                transaction_id: orderId,
                value: created.data.totalKes,
                currency: "KES",
                items: [
                  {
                    item_id: item.itemKey,
                    item_name: item.name,
                    item_category: item.kind,
                    item_variant: item.variant || undefined,
                    quantity: item.qty || 1,
                  },
                ],
              });
            }
            setStep("paid");
          } else if (order.status === "failed" || attempts > 40) {
            if (pollRef.current) clearInterval(pollRef.current);
            setStep("phone");
            setError("Payment wasn't completed. Check your phone and try again.");
          }
        } catch {
          // transient network hiccup during polling: try again next tick
        }
      }, 3000);
    } catch (err) {
      setStep("phone");
      setError(err instanceof Error ? err.message : "Something went wrong, try again");
    }
  }

  const itemLabel = item ? item.name + (item.variant ? ` (${item.variant})` : "") : "";

  return (
    <CheckoutContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>
        {item && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={close}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-5"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[400px] rounded-3xl border border-magenta/40 bg-surface p-8"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-lg uppercase text-paper">Checkout</div>
                <button
                  onClick={close}
                  aria-label="Close"
                  className="text-paper/50 transition-colors duration-150 hover:text-paper active:scale-[0.95]"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-5">
                {step === "phone" && (
                  <form onSubmit={submitPhone} className="flex flex-col gap-3.5">
                    <div className="text-sm text-paper/80">
                      Buying: {itemLabel}
                      {item?.priceKes ? ` - KES ${item.priceKes.toLocaleString("en-KE")}` : ""}
                    </div>
                    <input
                      type="tel"
                      required
                      autoFocus
                      placeholder="Safaricom number, e.g. 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="rounded-[10px] border border-white/25 bg-ink px-3.5 py-3.5 text-[15px] text-paper outline-none transition-colors duration-150 focus:border-magenta"
                    />
                    {error && <div className="text-[13px] text-red-400">{error}</div>}
                    <button
                      type="submit"
                      className="rounded-[10px] bg-magenta py-3.5 text-[15px] font-bold text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
                    >
                      Pay with M-Pesa
                    </button>
                  </form>
                )}
                {step === "creating" && (
                  <div className="py-5 text-center text-paper">Setting up your order...</div>
                )}
                {step === "paying" && (
                  <div className="py-2.5 text-center">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                      <rect x="7" y="2" width="10" height="20" rx="2" />
                      <line x1="11" y1="18" x2="13" y2="18" />
                      <path d="M20 6a6 6 0 0 0-6-4M22 6a8 8 0 0 0-8-6" />
                    </svg>
                    <div className="mt-2.5 font-bold text-paper">Check your phone</div>
                    <div className="mt-1.5 text-[13.5px] text-paper/70">
                      Enter your M-Pesa PIN to complete the KES {totalKes.toLocaleString("en-KE")} payment.
                    </div>
                  </div>
                )}
                {step === "paid" && (
                  <div className="py-2.5 text-center">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#8FE89A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 12.5l2.5 2.5L16 9" />
                    </svg>
                    <div className="mt-2.5 text-[17px] font-bold text-[#8FE89A]">Payment confirmed</div>
                    <div className="mt-1.5 text-[13.5px] text-paper/70">
                      A confirmation email is on its way if you provided one. Welcome to the gang.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CheckoutContext.Provider>
  );
}
