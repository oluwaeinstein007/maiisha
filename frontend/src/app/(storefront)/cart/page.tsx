"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPence } from "@/lib/money";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    router.push(user ? "/checkout" : "/login?redirect=/checkout");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-ink-soft">
        Loading your cart…
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Browse the catalogue and add something you love.
        </p>
        <Link href="/search">
          <Button className="mt-6">Continue shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl text-ink">Your cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-ink/10">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-6">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-ink/5">
                {item.product.image_url && (
                  <Image
                    src={item.product.image_url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="text-sm font-medium text-ink hover:text-gold"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink-soft">
                    {[item.variant.size, item.variant.colour].filter(Boolean).join(" / ")}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{formatPence(item.unit_price_pence)}</p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-ink/20">
                    <button
                      onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                      className="p-2 text-ink-soft hover:text-ink"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-xs">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateItem(item.id, Math.min(item.variant.stock_quantity, item.quantity + 1))
                      }
                      className="p-2 text-ink-soft hover:text-ink"
                      aria-label="Increase quantity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-ink-soft/60 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="shrink-0 text-sm font-medium text-ink">
                {formatPence(item.line_total_pence)}
              </p>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-ink/10 p-6">
          <h2 className="font-display text-lg text-ink">Order summary</h2>
          <div className="mt-4 flex justify-between text-sm text-ink-soft">
            <span>Subtotal</span>
            <span className="text-ink">{formatPence(cart.subtotal_pence)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-soft/70">
            VAT and shipping calculated at checkout.
          </p>
          <Button onClick={handleCheckout} className="mt-6 w-full" size="lg">
            Checkout
          </Button>
        </aside>
      </div>
    </div>
  );
}
