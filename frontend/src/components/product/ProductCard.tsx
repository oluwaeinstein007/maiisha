import Image from "next/image";
import Link from "next/link";
import { isUnoptimizedImage } from "@/lib/image";
import { PriceTag } from "@/components/ui/PriceTag";
import { Stars } from "@/components/ui/Stars";
import { WishlistButton } from "@/components/product/WishlistButton";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const outOfStock = product.in_stock === false;

  return (
    <div className="relative">
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-ink/5">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt_text ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={isUnoptimizedImage(image.url)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-soft/50">
            No image
          </div>
        )}
        {(product.sale || outOfStock) && (
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {product.sale && (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
                <span className="sr-only">Sale: </span>
                {product.sale.discount_percent > 0 ? `−${product.sale.discount_percent}%` : "Sale"}
              </span>
            )}
            {outOfStock && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-cream">
                Out of stock
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs uppercase tracking-wide text-ink-soft/60">
          {product.brand?.name ?? product.category.name}
        </p>
        <h3 className="text-sm font-medium text-ink group-hover:text-gold transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-ink-soft">
          <PriceTag price={product.min_price_pence} compareAt={product.compare_at_price_pence} />
        </p>
        {!!product.rating_count && product.rating_avg != null && (
          <p className="flex items-center gap-1.5 pt-0.5 text-xs text-ink-soft/70">
            <Stars value={product.rating_avg} size={12} />
            <span>({product.rating_count})</span>
          </p>
        )}
      </div>
    </Link>
    <WishlistButton productId={product.id} className="absolute right-2 top-2" />
    </div>
  );
}

export function ProductGrid({
  products,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  products: Product[];
  /** Tailwind column classes — listings with a filter sidebar have less width to fill. */
  columns?: string;
}) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-soft/70">
        No products found.
      </p>
    );
  }

  return (
    <div className={`grid gap-x-4 gap-y-8 ${columns}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
