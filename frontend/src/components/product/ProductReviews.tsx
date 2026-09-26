"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Star } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";
import type { ReviewsResponse } from "@/lib/types";

export function ProductReviews({ slug }: { slug: string }) {
  const { user } = useAuth();
  const { data, mutate } = useSWR<ReviewsResponse>(`/api/products/${slug}/reviews?u=${user?.id ?? 0}`, () =>
    api.get<ReviewsResponse>(`/api/products/${slug}/reviews`),
  );

  if (!data) return null;
  const { summary } = data;

  return (
    <section id="reviews" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl text-ink">Customer reviews</h2>

      {summary.count > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="text-3xl font-display text-ink">{summary.average}</p>
            <Stars value={summary.average ?? 0} />
            <p className="mt-1 text-xs text-ink-soft">
              {summary.count} review{summary.count === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="min-w-48 flex-1 space-y-1 text-xs text-ink-soft sm:max-w-xs">
            {[5, 4, 3, 2, 1].map((star) => (
              <li key={star} className="flex items-center gap-2">
                <span className="w-3">{star}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <span
                    className="block h-full bg-gold"
                    style={{ width: `${((summary.distribution[star] ?? 0) / summary.count) * 100}%` }}
                  />
                </span>
                <span className="w-5 text-right">{summary.distribution[star] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">No reviews yet.</p>
      )}

      {data.can_review ? (
        <ReviewForm slug={slug} existing={data.my_review} onSaved={() => mutate()} />
      ) : !user ? (
        <p className="mt-6 text-sm text-ink-soft">
          <Link href="/login" className="underline hover:text-gold">Sign in</Link> to review products you&apos;ve bought.
        </p>
      ) : null}

      <ul className="mt-8 divide-y divide-ink/10">
        {data.data.map((review) => (
          <li key={review.id} className="py-5">
            <Stars value={review.rating} />
            {review.title && <p className="mt-2 text-sm font-medium text-ink">{review.title}</p>}
            {review.body && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{review.body}</p>}
            <p className="mt-2 text-xs text-ink-soft/70">
              {review.author} · {new Date(review.created_at).toLocaleDateString("en-GB")} · Verified purchase
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReviewForm({
  slug,
  existing,
  onSaved,
}: {
  slug: string;
  existing: ReviewsResponse["my_review"];
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating) {
      setError("Please choose a star rating.");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await api.post(`/api/products/${slug}/reviews`, { rating, title: title || null, body: body || null });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 max-w-xl space-y-3 rounded-xl border border-ink/10 p-5">
      <p className="text-sm font-medium text-ink">{existing ? "Edit your review" : "Write a review"}</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1 text-gold">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            className="flex h-9 w-9 items-center justify-center"
          >
            <Star size={22} fill={n <= rating ? "currentColor" : "none"} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Headline (optional)"
        aria-label="Review headline"
        className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-base outline-none focus:border-gold sm:text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="What did you think? (optional)"
        aria-label="Review"
        className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-base outline-none focus:border-gold sm:text-sm"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="text-sm text-ink-soft">Thanks for your review.</p>}
      <Button type="submit" loading={saving}>{existing ? "Update review" : "Submit review"}</Button>
    </form>
  );
}
