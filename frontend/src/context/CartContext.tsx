"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import useSWR from "swr";
import { api, swrFetcher } from "@/lib/api";
import type { Cart } from "@/lib/types";

interface CartContextValue {
  cart: Cart | undefined;
  isLoading: boolean;
  itemCount: number;
  addItem: (productVariantId: number, quantity: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  refresh: () => Promise<Cart | undefined>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: cart, isLoading, mutate } = useSWR<Cart>("/api/cart", swrFetcher);

  const addItem = useCallback(
    async (productVariantId: number, quantity: number) => {
      const updated = await api.post<Cart>("/api/cart/items", {
        product_variant_id: productVariantId,
        quantity,
      });
      await mutate(updated, false);
    },
    [mutate],
  );

  const updateItem = useCallback(
    async (itemId: number, quantity: number) => {
      const updated = await api.patch<Cart>(`/api/cart/items/${itemId}`, { quantity });
      await mutate(updated, false);
    },
    [mutate],
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      const updated = await api.delete<Cart>(`/api/cart/items/${itemId}`);
      await mutate(updated, false);
    },
    [mutate],
  );

  const refresh = useCallback(async () => mutate(), [mutate]);

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  return (
    <CartContext.Provider
      value={{ cart, isLoading, itemCount, addItem, updateItem, removeItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
