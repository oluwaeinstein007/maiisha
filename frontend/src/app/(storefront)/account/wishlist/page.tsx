"use client";

import Link from "next/link";
import useSWR from "swr";
import { swrFetcherResource } from "@/lib/api";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const { products } = useWishlist();
  const { data: recommendations } = useSWR<Product[]>(
    products && products.length > 0 ? `/api/wishlist/recommendations?n=${products.length}` : null,
    swrFetcherResource,
  );

  return (
    <div>
      <h2 className="font-display text-lg text-ink">Wishlist</h2>

      {!products ? (
        <p className="mt-4 text-sm text-ink-soft">Loading…</p>
      ) : products.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Nothing saved yet. Tap the heart on any product to keep it here.{" "}
          <Link href="/search" className="underline hover:text-gold">Browse products</Link>
        </p>
      ) : (
        <div className="mt-4">
          <ProductGrid products={products} columns="grid-cols-2 lg:grid-cols-3" />
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <section className="mt-12">
          <h3 className="font-display text-lg text-ink">You may also like</h3>
          <p className="mt-1 text-xs text-ink-soft">Picked to match what you&apos;ve saved.</p>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {recommendations.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
