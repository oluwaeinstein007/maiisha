import { api, buildQuery } from "@/lib/api";
import type { PaginatedResponse, Product } from "@/lib/types";
import { ProductGrid } from "@/components/product/ProductCard";
import { ProductFilterBar } from "@/components/product/ProductFilterBar";
import { Pagination } from "@/components/ui/Pagination";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const page = Number(query.page ?? "1");

  const products = await api.get<PaginatedResponse<Product>>(
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
    </div>
  );
}
