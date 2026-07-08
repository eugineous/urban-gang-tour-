"use client";

import { useState } from "react";
import BuyButton from "../_components/BuyButton";
import { SIZES, COLORS, type MerchProduct } from "@/content/merch";
import type { CatalogItem } from "@/content/catalog";

const WHATSAPP_NUMBER = "254799886247";

export default function ProductCard({ product, price }: { product: MerchProduct; price: CatalogItem | undefined }) {
  const [selected, setSelected] = useState(product.defaultOption);

  const options = product.optionType === "size" ? SIZES : product.optionType === "color" ? COLORS : [product.info || "One size"];
  const orderText = product.orderText.replace("{v}", selected);
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText)}`;

  return (
    <div className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition-all duration-150 ease-out hover:-translate-y-1 hover:border-magenta">
      <div className="relative aspect-square overflow-hidden bg-[#F2EFEC]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.img}
          alt={price?.name || product.key}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute left-3.5 top-3.5 -rotate-2 rounded-full bg-magenta px-3.5 py-1.5 font-display text-[11px] uppercase tracking-wide text-paper">
          {product.tag}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="font-display text-[19px] uppercase leading-tight">{price?.name || product.key}</div>
          {price && (
            <div className="shrink-0 font-display text-[16px] text-gold">KES {price.priceKes.toLocaleString("en-KE")}</div>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-paper/60">{product.desc}</p>

        {product.optionType !== "one" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSelected(opt)}
                className="min-w-[38px] rounded-lg border-2 px-3 py-2 text-[12px] font-bold text-paper transition-colors duration-150 hover:border-gold"
                style={{
                  borderColor: selected === opt ? "#C7238E" : "rgba(255,255,255,0.2)",
                  background: selected === opt ? "#C7238E" : "transparent",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {product.optionType === "one" && (
          <div className="mt-4 inline-block rounded-lg border-2 border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-bold text-paper/70">
            {product.info || "One size"}
          </div>
        )}

        {price && (
          <BuyButton
            className="mt-4 w-full rounded-xl bg-magenta py-3.5 text-center text-[14px] font-bold text-paper transition-all duration-150 ease-out hover:bg-magenta-bright active:scale-[0.97]"
            item={{ kind: "merch", itemKey: product.key, name: price.name, variant: selected, priceKes: price.priceKes }}
          >
            Pay with M-Pesa
          </BuyButton>
        )}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 block rounded-xl bg-white/[0.06] py-3 text-center text-[13px] font-bold text-paper transition-colors duration-150 hover:bg-white/[0.12]"
        >
          Or order on WhatsApp
        </a>
      </div>
    </div>
  );
}
