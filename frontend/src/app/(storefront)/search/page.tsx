import { AlertTriangle } from "lucide-react";
import { api, buildQuery } from "@/lib/api";
import type { PaginatedResponse, Product } from "@/lib/types";
import { ProductGrid } from "@/components/product/ProductCard";
import { ProductFilterBar } from "@/components/product/ProductFilterBar";
import { Pagination } from "@/components/ui/Pagination";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const EMPTY_RESULTS: PaginatedResponse<Product> = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 24, total: 0 },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const page = Number(query.page ?? "1");

  let products: PaginatedResponse<Product>;
  let loadError = false;
  try {
    products = await api.get<PaginatedResponse<Product>>(
      `/api/products${buildQuery({
        search: query.q,
        size: query.size,
        colour: query.colour,
        min_price: query.min_price,
        max_price: query.max_price,
        sort: query.sort,
        page,
      })}`,
    );
  } catch {
    products = EMPTY_RESULTS;
    loadError = true;
  }

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams(query as Record<string, string>);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl text-ink">
        {query.q ? `Results for “${query.q}”` : "All products"}
      </h1>

      {loadError ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-ink/10 py-16 text-center">
          <AlertTriangle size={24} className="text-gold" />
          <p className="text-sm text-ink-soft">
            We couldn&apos;t load products right now. Please try again in a moment.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            {products.meta.total} {products.meta.total === 1 ? "product" : "products"}
          </p>

          <div className="mt-8">
            <ProductFilterBar />
          </div>

          <div className="mt-8">
            <ProductGrid products={products.data} />
            <Pagination meta={products.meta} buildHref={buildHref} />
          </div>
        </>
      )}
    </div>
  );
}
