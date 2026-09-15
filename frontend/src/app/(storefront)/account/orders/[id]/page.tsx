"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { swrFetcherResource } from "@/lib/api";
import { formatDate, formatPence } from "@/lib/money";
import { OrderStatusTimeline } from "@/components/order/OrderStatusTimeline";
import type { Order } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: order, error } = useSWR<Order>(`/api/orders/${params.id}`, swrFetcherResource);

  if (error) {
    return <p className="text-sm text-red-600">Could not load this order.</p>;
  }

  if (!order) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/account/orders" className="text-xs text-ink-soft hover:text-gold">
            ← Back to orders
          </Link>
          <h2 className="mt-1 font-display text-xl text-ink">{order.order_number}</h2>
          <p className="text-xs text-ink-soft">Placed {formatDate(order.created_at)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 p-6">
        <OrderStatusTimeline status={order.status} />
      </div>

      {order.shipment && (
        <div className="rounded-xl border border-ink/10 p-6">
          <h3 className="font-display text-lg text-ink">Delivery</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Courier: <span className="text-ink">{order.shipment.courier}</span>
          </p>
          {order.shipment.tracking_number && (
            <p className="mt-1 text-sm text-ink-soft">
              Tracking:{" "}
              {order.shipment.tracking_url ? (
                <a
                  href={order.shipment.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink underline hover:text-gold"
                >
                  {order.shipment.tracking_number}
                </a>
              ) : (
                <span className="text-ink">{order.shipment.tracking_number}</span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-ink/10">
          <ul className="divide-y divide-ink/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-ink">{item.product_name}</p>
                  <p className="text-xs text-ink-soft">
                    {[item.size, item.colour].filter(Boolean).join(" / ")} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm text-ink">{formatPence(item.line_total_pence)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-ink/10 p-6">
            <h3 className="font-display text-lg text-ink">Summary</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="text-ink">{formatPence(order.subtotal_pence)}</dd>
              </div>
              {order.discount_pence > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <dt>Discount</dt>
                  <dd className="text-ink">-{formatPence(order.discount_pence)}</dd>
                </div>
              )}
              <div className="flex justify-between text-ink-soft">
                <dt>Shipping</dt>
                <dd className="text-ink">
                  {order.shipping_pence === 0 ? "Free" : formatPence(order.shipping_pence)}
                </dd>
              </div>
              <div className="flex justify-between text-ink-soft">
                <dt>VAT</dt>
                <dd className="text-ink">{formatPence(order.vat_pence)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 font-medium text-ink">
                <dt>Total</dt>
                <dd>{formatPence(order.total_pence)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-ink/10 p-6">
            <h3 className="font-display text-lg text-ink">Delivery address</h3>
            <address className="mt-3 text-sm not-italic text-ink-soft">
              {order.address.full_name}
              <br />
              {order.address.line1}
              <br />
              {order.address.line2 && (
                <>
                  {order.address.line2}
                  <br />
                </>
              )}
              {order.address.city}, {order.address.postcode}
              <br />
              {order.address.country}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
