"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { CheckCircle2 } from "lucide-react";
import { swrFetcher } from "@/lib/api";
import { formatPence } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/lib/types";

export function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const { data: order } = useSWR<Order>(orderId ? `/api/orders/${orderId}` : null, swrFetcher);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <CheckCircle2 size={48} className="text-gold" />
      <h1 className="mt-4 font-display text-3xl text-ink">Thank you for your order</h1>
      <p className="mt-2 text-sm text-ink-soft">
        A confirmation has been sent to your email and phone.
      </p>

      {order && (
        <div className="mt-6 w-full rounded-xl border border-ink/10 p-6 text-left">
          <p className="text-sm text-ink-soft">Order number</p>
          <p className="text-lg font-medium text-ink">{order.order_number}</p>
          <p className="mt-3 text-sm text-ink-soft">Total</p>
          <p className="text-lg font-medium text-ink">{formatPence(order.total_pence)}</p>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        {orderId && (
          <Link href={`/account/orders/${orderId}`}>
            <Button>Track order</Button>
          </Link>
        )}
        <Link href="/search">
          <Button variant="outline">Continue shopping</Button>
        </Link>
      </div>
    </div>
  );
}
