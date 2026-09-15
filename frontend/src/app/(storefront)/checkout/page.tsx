"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";
import { useCart } from "@/context/CartContext";
import { api, ApiError, fieldError } from "@/lib/api";
import { formatPence } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import type { CheckoutPreview, Order } from "@/lib/types";

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutFlow />
    </RequireAuth>
  );
}

function CheckoutFlow() {
  const { cart, isLoading: cartLoading, refresh: refreshCart } = useCart();
  const router = useRouter();

  const [addressId, setAddressId] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<{ order: Order; clientSecret: string } | null>(
    null,
  );

  const loadPreview = async (code?: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await api.post<CheckoutPreview>("/api/checkout/preview", {
        discount_code: code || undefined,
      });
      setPreview(data);
      setAppliedCode(code ?? "");
    } catch (err) {
      setPreview(null);
      setPreviewError(
        err instanceof ApiError ? fieldError(err.errors, "discount_code") ?? err.message : "Could not calculate totals.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!cartLoading && cart && cart.items.length > 0) {
      loadPreview();
    } else if (!cartLoading) {
      setPreviewLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartLoading, cart?.items.length]);

  const handlePlaceOrder = async () => {
    if (!addressId) return;
    setPlacingOrder(true);
    setOrderError(null);
    try {
      const result = await api.post<{ order: Order; client_secret: string }>("/api/checkout", {
        address_id: addressId,
        discount_code: appliedCode || undefined,
      });
      setCheckoutResult({ order: result.order, clientSecret: result.client_secret });
      refreshCart();
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : "Could not place your order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (cartLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-ink-soft">Loading…</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-ink-soft">Your cart is empty.</p>
        <Link href="/search" className="mt-4 inline-block text-sm font-medium text-ink hover:text-gold">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (checkoutResult) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="font-display text-2xl text-ink">Payment</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Order {checkoutResult.order.order_number} · {formatPence(checkoutResult.order.total_pence)}
        </p>
        <div className="mt-8">
          <StripePaymentForm
            clientSecret={checkoutResult.clientSecret}
            orderId={checkoutResult.order.id}
            onSuccess={() => router.push(`/checkout/success?order=${checkoutResult.order.id}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl text-ink">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg text-ink">Delivery address</h2>
            <div className="mt-4">
              <AddressSelector selectedId={addressId} onSelect={setAddressId} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Discount code</h2>
            <div className="mt-4 flex gap-2">
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Enter code"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => loadPreview(discountCode)}
                loading={previewLoading}
              >
                Apply
              </Button>
            </div>
            {previewError && <p className="mt-2 text-sm text-red-600">{previewError}</p>}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-ink/10 p-6">
          <h2 className="font-display text-lg text-ink">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between">
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <span className="text-ink">{formatPence(item.line_total_pence)}</span>
              </li>
            ))}
          </ul>

          {preview && (
            <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="text-ink">{formatPence(preview.subtotal_pence)}</dd>
              </div>
              {preview.discount_pence > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <dt>Discount</dt>
                  <dd className="text-ink">-{formatPence(preview.discount_pence)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-soft">
                <dt>Shipping</dt>
                <dd className="text-ink">
                  {preview.shipping_pence === 0 ? "Free" : formatPence(preview.shipping_pence)}
                </dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>VAT ({Math.round(preview.vat_rate * 100)}%, included)</dt>
                <dd className="text-ink">{formatPence(preview.vat_pence)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 font-medium text-ink">
                <dt>Total</dt>
                <dd>{formatPence(preview.total_pence)}</dd>
              </div>
            </dl>
          )}

          {orderError && <p className="mt-3 text-sm text-red-600">{orderError}</p>}

          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={!addressId || !preview}
            loading={placingOrder}
            onClick={handlePlaceOrder}
          >
            Continue to payment
          </Button>
        </aside>
      </div>
    </div>
  );
}
