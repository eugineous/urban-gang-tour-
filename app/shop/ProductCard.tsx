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
    <div className="relative pt-4">
      <div className="absolute left-1/2 top-0 z-10 h-6 w-3.5 -translate-x-1/2 rounded-lg border-2 border-ink bg-concrete" />
      <div className="overflow-hidden rounded-[18px] border-[3px] border-ink bg-white shadow-[5px_6px_0_#111]">
        <div className="relative aspect-square border-b-2 border-dashed border-ink bg-white">
          <img src={product.img} alt={price?.name || product.key} className="h-full w-full object-contain p-3.5" />
          <span className="absolute left-[-34px] top-3 -rotate-45 border-2 border-ink bg-magenta px-9 py-0.5 text-[10px] font-bold uppercase text-white">
            {product.tag}
          </span>
          {price && (
            <span className="absolute bottom-2.5 right-2.5 rotate-3 rounded-lg border-2 border-ink bg-gold px-2.5 py-1 font-display text-[15px] shadow-[2px_2px_0_#111]">
              KES {price.priceKes.toLocaleString("en-KE")}
            </span>
          )}
        </div>
        <div className="flex flex-col p-3.5">
          <div className="font-display text-[15px] uppercase leading-none">{price?.name || product.key}</div>
          <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-ink/60">{product.desc}</p>

          {product.optionType !== "one" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelected(opt)}
                  className={`min-w-[36px] rounded-md border-2 border-ink px-2.5 py-1.5 text-[11.5px] font-bold ${selected === opt ? "bg-magenta text-white" : "bg-white"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          {product.optionType === "one" && (
            <div className="mt-3 inline-block rounded-md border-2 border-ink/20 bg-concrete px-2.5 py-1.5 text-[11.5px] font-bold text-ink/70">
              {product.info || "One size"}
            </div>
          )}

          {price && (
            <BuyButton
              className="mt-3 w-full rounded-lg border-[3px] border-ink bg-cyan py-2.5 text-center text-[12.5px] font-bold uppercase text-ink transition-colors duration-150 hover:bg-gold"
              item={{ kind: "merch", itemKey: product.key, name: price.name, variant: selected, priceKes: price.priceKes }}
            >
              Pay with M-Pesa
            </BuyButton>
          )}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block rounded-lg border-2 border-ink/15 bg-concrete py-2.5 text-center text-[12px] font-bold text-ink/80"
          >
            Or order on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
