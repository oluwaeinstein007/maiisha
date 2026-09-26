"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { Mail, MapPin } from "lucide-react";
import { api, ApiError, buildQuery, fieldError, swrFetcher, swrFetcherResource } from "@/lib/api";
import { formatDate, formatDateTime, formatPence } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/orderStatus";
import type { Customer, Order, PaginatedResponse } from "@/lib/types";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ResponsiveTable, type TableColumn } from "@/components/admin/ResponsiveTable";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";

const ORDER_COLUMNS: TableColumn<Order>[] = [
  {
    header: "Order",
    card: "title",
    cell: (order) => (
      <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink hover:text-gold">
        {order.order_number}
      </Link>
    ),
  },
  { header: "Date", cell: (order) => formatDateTime(order.created_at) },
  { header: "Total", cell: (order) => formatPence(order.total_pence) },
  {
    header: "Status",
    card: "badge",
    cell: (order) => (
      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${ORDER_STATUS_STYLES[order.status]}`}>
        {ORDER_STATUS_LABELS[order.status]}
      </span>
    ),
  },
];

function MessageCustomerForm({ customerId }: { customerId: number }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setError(null);
    setErrors({});
    try {
      await api.post(`/api/admin/customers/${customerId}/message`, { subject, message });
      setStatus("sent");
      setSubject("");
      setMessage("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        setErrors(err.errors ?? {});
        setError(err.errors ? null : err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <Mail size={18} className="text-gold-deep" aria-hidden="true" />
        Send a message
      </h2>
      <p className="text-xs text-ink-soft">Emailed directly to this customer — for a question about an order, or anything else.</p>

      <Input
        label="Subject"
        required
        maxLength={150}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        error={fieldError(errors, "subject")}
      />
      <Textarea
        label="Message"
        required
        maxLength={5000}
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={fieldError(errors, "message")}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {status === "sent" && (
        <p role="status" className="text-sm text-emerald-700">
          Message sent.
        </p>
      )}

      <Button type="submit" loading={status === "sending"}>
        Send message
      </Button>
    </form>
  );
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: customer, error: customerError } = useSWR<Customer>(
    `/api/admin/customers/${params.id}`,
    swrFetcherResource,
  );
  const [page, setPage] = useState(1);
  const { data: orders } = useSWR<PaginatedResponse<Order>>(
    customer ? `/api/admin/customers/${params.id}/orders${buildQuery({ page, per_page: 10 })}` : null,
    swrFetcher,
  );

  if (customerError) {
    return <p className="text-sm text-red-600">Could not load this customer.</p>;
  }

  if (!customer) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="inline-flex min-h-10 items-center text-xs text-ink-soft hover:text-gold">
          ← All customers
        </Link>
        <h1 className="mt-1 font-display text-2xl text-ink">{customer.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {customer.email}
          {customer.phone && ` · ${customer.phone}`} · Joined {formatDate(customer.created_at)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
          <p className="text-xs text-ink-soft">Orders (paid)</p>
          <p className="mt-1 font-sans text-2xl font-semibold text-ink">{customer.orders_count}</p>
        </div>
        <div className="rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
          <p className="text-xs text-ink-soft">Total spent</p>
          <p className="mt-1 font-sans text-2xl font-semibold text-ink">{formatPence(customer.total_spent_pence)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <h2 className="font-display text-lg text-ink">Orders</h2>
          {orders ? (
            <>
              <ResponsiveTable rows={orders.data} columns={ORDER_COLUMNS} getKey={(order) => order.id} empty="No orders yet." />
              <PaginationControls page={orders.meta.current_page} lastPage={orders.meta.last_page} onChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-ink-soft">Loading…</p>
          )}
        </div>

        <div className="space-y-6">
          <MessageCustomerForm customerId={customer.id} />

          <div className="rounded-xl border border-ink/10 bg-white p-4 sm:p-5">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <MapPin size={18} className="text-gold-deep" aria-hidden="true" />
              Addresses
            </h2>
            {!customer.addresses || customer.addresses.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No saved addresses.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="text-sm text-ink-soft">
                    <p className="font-medium text-ink">
                      {address.full_name}
                      {address.is_default && <span className="ml-2 text-xs text-gold-deep">Default</span>}
                    </p>
                    <address className="not-italic">
                      {address.line1}
                      {address.line2 && <>, {address.line2}</>}
                      <br />
                      {address.city}, {address.postcode}
                      <br />
                      {address.country}
                    </address>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
