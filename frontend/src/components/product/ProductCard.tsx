import Image from "next/image";
import Link from "next/link";
import { formatPence } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const outOfStock = product.in_stock === false;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-ink/5">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt_text ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-soft/50">
            No image
          </div>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-cream">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-xs uppercase tracking-wide text-ink-soft/60">
          {product.category.name}
        </p>
        <h3 className="text-sm font-medium text-ink group-hover:text-gold transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-ink-soft">{formatPence(product.min_price_pence)}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-ink-soft/70">
        No products found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
