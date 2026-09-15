"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { api, ApiError, swrFetcherResource } from "@/lib/api";
import { formatDateTime, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import { OrderStatusTimeline } from "@/components/order/OrderStatusTimeline";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import type { Order, OrderStatus } from "@/lib/types";

const SETTABLE_STATUSES: OrderStatus[] = ["placed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: order, mutate } = useSWR<Order>(`/api/admin/orders/${params.id}`, swrFetcherResource);

  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/api/admin/orders/${order.id}/status`, { status: nextStatus });
      setNextStatus("");
      mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update order status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/orders" className="text-xs text-ink-soft hover:text-gold">
          ← Back to orders
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="font-display text-2xl text-ink">{order.order_number}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_STYLES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {order.customer?.name} · {order.customer?.email} · {formatDateTime(order.created_at)}
        </p>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-6">
        <OrderStatusTimeline status={order.status} />
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="font-display text-lg text-ink">Update status</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
            className="max-w-xs"
          >
            <option value="">Select new status</option>
            {SETTABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button onClick={handleUpdateStatus} loading={updating} disabled={!nextStatus}>
            Update
          </Button>
        </div>
        {(nextStatus === "shipped" || nextStatus === "delivered") && (
          <p className="mt-2 text-xs text-amber-700">
            This will email and text the customer immediately.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-ink/10 bg-white">
          <ul className="divide-y divide-ink/10">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-ink">{item.product_name}</p>
                  <p className="text-xs text-ink-soft">
                    {[item.size, item.colour].filter(Boolean).join(" / ")} · Qty {item.quantity} ·{" "}
                    {item.sku}
                  </p>
                </div>
                <p className="text-sm text-ink">{formatPence(item.line_total_pence)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-ink/10 bg-white p-6">
            <dl className="space-y-2 text-sm">
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
                <dd className="text-ink">{formatPence(order.shipping_pence)}</dd>
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

          <div className="rounded-xl border border-ink/10 bg-white p-6">
            <h3 className="font-display text-base text-ink">Delivery address</h3>
            <address className="mt-2 text-sm not-italic text-ink-soft">
              {order.address.full_name}
              <br />
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.city}, {order.address.postcode}
              <br />
              {order.address.country}
              {order.address.phone && (
                <>
                  <br />
                  {order.address.phone}
                </>
              )}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
