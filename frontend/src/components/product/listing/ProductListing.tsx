import { AlertTriangle } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import type { ListingData, SearchQuery } from "@/lib/listing";
import type { ListingScope } from "@/lib/productFilters";
import { ListingShell } from "./ListingShell";

/** Filters + sort + grid + pagination for a category, search or sale page. */
export function ProductListing({
  data,
  scope,
  query,
}: {
  data: ListingData;
  scope: ListingScope;
  query: SearchQuery;
}) {
  const { products, options } = data;

  if (!products) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-ink/10 px-6 py-16 text-center">
        <AlertTriangle size={24} className="text-gold" aria-hidden="true" />
        <p className="text-sm text-ink-soft">
          We couldn&apos;t load products right now. Please try again in a moment.
        </p>
      </div>
    );
  }

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  };

  return (
    <ListingShell total={products.meta.total} options={options} scope={scope}>
      <ProductGrid products={products.data} columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
      <Pagination meta={products.meta} buildHref={buildHref} />
    </ListingShell>
  );
}
