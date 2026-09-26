"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Trash2 } from "lucide-react";
import { api, ApiError, buildQuery } from "@/lib/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { IconAction } from "@/components/admin/IconAction";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { ResponsiveTable } from "@/components/admin/ResponsiveTable";
import { Stars } from "@/components/ui/Stars";

interface AdminReview {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  product: { id: number; name: string; slug: string };
  customer: { id: number; name: string; email: string };
}

interface AdminReviewsResponse {
  data: AdminReview[];
  meta: { current_page: number; last_page: number; total: number };
}

export default function AdminReviewsPage() {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [actionError, setActionError] = useState<string | null>(null);

  const key = `/api/admin/reviews${buildQuery({ page, rating, search: debouncedSearch })}`;
  const { data, error, mutate } = useSWR<AdminReviewsResponse>(key, (path: string) =>
    api.get<AdminReviewsResponse>(path),
  );

  const handleDelete = async (review: AdminReview) => {
    if (!confirm(`Remove this review of “${review.product.name}”? Customers won't see it any more.`)) return;
    setActionError(null);
    try {
      await api.delete(`/api/admin/reviews/${review.id}`);
      await mutate();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not remove that review.");
    }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl text-ink">Reviews</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every review is verified-purchase. Remove anything abusive or off-topic.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search product or text…"
          aria-label="Search reviews"
          className="min-w-0 flex-1 rounded-md border border-ink/15 bg-white px-3 py-2 text-base outline-none focus:border-gold sm:max-w-xs sm:text-sm"
        />
        <select
          value={rating}
          onChange={(e) => {
            setRating(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by rating"
          className="rounded-md border border-ink/15 bg-white px-3 py-2 text-base outline-none focus:border-gold sm:text-sm"
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {error && !data && <p className="mt-6 text-sm text-red-600">Could not load reviews.</p>}

      <div className="mt-6">
        {data ? (
          <>
            <ResponsiveTable
              rows={data.data}
              getKey={(review) => review.id}
              empty="No reviews found."
              columns={[
                {
                  header: "Product",
                  card: "title",
                  cell: (review) => (
                    <Link href={`/product/${review.product.slug}`} className="hover:text-gold">
                      {review.product.name}
                    </Link>
                  ),
                },
                { header: "Rating", card: "badge", cell: (review) => <Stars value={review.rating} /> },
                {
                  header: "Review",
                  cell: (review) => (
                    <span className="block max-w-sm whitespace-pre-line">
                      {review.title && <span className="block font-medium text-ink">{review.title}</span>}
                      {review.body ?? <span className="text-ink-soft/60">No comment</span>}
                    </span>
                  ),
                },
                {
                  header: "Customer",
                  cell: (review) => (
                    <span className="block">
                      {review.customer.name}
                      <span className="block text-xs text-ink-soft">{review.customer.email}</span>
                    </span>
                  ),
                },
                {
                  header: "Date",
                  cell: (review) => new Date(review.created_at).toLocaleDateString("en-GB"),
                },
                {
                  header: "",
                  card: "actions",
                  cell: (review) => (
                    <div className="flex justify-end">
                      <IconAction danger label={`Remove review of ${review.product.name}`} onClick={() => handleDelete(review)}>
                        <Trash2 size={15} />
                      </IconAction>
                    </div>
                  ),
                },
              ]}
            />
            <PaginationControls page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />
          </>
        ) : (
          !error && <p className="text-sm text-ink-soft">Loading…</p>
        )}
      </div>
    </div>
  );
}
