"use client";

import { useEffect, useState } from "react";
import { api, buildQuery } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import type { PaginatedResponse, Product } from "@/lib/types";

const KEY = "maiisha:recently-viewed";
const MAX = 12;

function readSlugs(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Records the product being viewed, and shows the shopper's other recently viewed products. */
export function RecentlyViewed({ slug }: { slug: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const previous = readSlugs().filter((s) => s !== slug);
    try {
      localStorage.setItem(KEY, JSON.stringify([slug, ...previous].slice(0, MAX)));
    } catch {
      // storage blocked — the row just won't persist
    }

    const shown = previous.slice(0, 4);
    if (shown.length === 0) return;

    let cancelled = false;
    api
      .get<PaginatedResponse<Product>>(`/api/products${buildQuery({ slugs: shown.join(","), per_page: 4 })}`)
      .then((res) => {
        if (cancelled) return;
        setProducts(shown.map((s) => res.data.find((p) => p.slug === s)).filter((p): p is Product => !!p));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-display text-2xl text-ink">Recently viewed</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
