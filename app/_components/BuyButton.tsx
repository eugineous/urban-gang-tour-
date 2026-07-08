"use client";

import { useCheckout, type CheckoutItem } from "./CheckoutProvider";

export default function BuyButton({
  className,
  children,
  item,
}: {
  className?: string;
  children: React.ReactNode;
  item: CheckoutItem;
}) {
  const { open } = useCheckout();
  return (
    <button type="button" className={className} onClick={() => open(item)}>
      {children}
    </button>
  );
}
