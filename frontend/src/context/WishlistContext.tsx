"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, swrFetcherResource } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Product } from "@/lib/types";

interface WishlistContextValue {
  products: Product[] | undefined;
  isSaved: (productId: number) => boolean;
  /** Saves/removes a product; sends signed-out shoppers to sign in first. */
  toggle: (productId: number) => Promise<void>;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data: products, mutate } = useSWR<Product[]>(user ? "/api/wishlist" : null, swrFetcherResource);

  const ids = useMemo(() => new Set(products?.map((p) => p.id) ?? []), [products]);

  const toggle = useCallback(
    async (productId: number) => {
      if (!user) {
        router.push("/login");
        return;
      }
      if (ids.has(productId)) {
        await mutate(
          async (current) => {
            await api.delete(`/api/wishlist/${productId}`);
            return current?.filter((p) => p.id !== productId);
          },
          { optimisticData: (current) => current?.filter((p) => p.id !== productId) ?? [], revalidate: false },
        );
      } else {
        await api.post("/api/wishlist", { product_id: productId });
        await mutate();
      }
    },
    [user, router, ids, mutate],
  );

  const value = useMemo(
    () => ({ products, isSaved: (id: number) => ids.has(id), toggle, count: ids.size }),
    [products, ids, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
