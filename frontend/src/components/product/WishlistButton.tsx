"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import clsx from "clsx";
import { useWishlist } from "@/context/WishlistContext";

export function WishlistButton({ productId, className }: { productId: number; className?: string }) {
  const { isSaved, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const saved = isSaved(productId);

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={async () => {
        setBusy(true);
        try {
          await toggle(productId);
        } finally {
          setBusy(false);
        }
      }}
      className={clsx(
        "flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:text-gold disabled:opacity-60",
        className,
      )}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} className={saved ? "text-gold" : undefined} />
    </button>
  );
}
