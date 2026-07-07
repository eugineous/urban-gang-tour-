"use client";
import { useEffect } from "react";

export default function TicketBuyButton({ event, tier }) {
  useEffect(() => {
    // Ensure the checkout modal script is loaded
    if (typeof window !== "undefined" && !window.UGTCheckout) {
      const script = document.createElement("script");
      script.src = "/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  function handleBuy() {
    if (typeof window !== "undefined" && window.UGTCheckout) {
      window.UGTCheckout.open({
        itemId: `ticket-${event.slug}-${tier.id}`,
        itemName: `${event.name} — ${tier.label}`,
        itemType: "ticket",
        size: null,
        price: Number(tier.price),
        eventSlug: event.slug,
        tierId: tier.id,
      });
    } else {
      alert("Checkout is loading, please try again in a moment.");
    }
  }

  return (
    <button className="btn btn-magenta btn-sm" onClick={handleBuy}>
      Buy Ticket — KES {Number(tier.price).toLocaleString()}
    </button>
  );
}
