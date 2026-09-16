import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { api, apiResource, ApiError, buildQuery } from "@/lib/api";
import type { Category, PaginatedResponse, Product } from "@/lib/types";
import { ProductGrid } from "@/components/product/ProductCard";
import { ProductFilterBar } from "@/components/product/ProductFilterBar";
import { Pagination } from "@/components/ui/Pagination";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

const EMPTY_RESULTS: PaginatedResponse<Product> = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 24, total: 0 },
};

async function getCategory(slug: string): Promise<Category | null> {
  try {
    return await apiResource.get<Category>(`/api/categories/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const page = Number(query.page ?? "1");

  let products: PaginatedResponse<Product>;
  let loadError = false;
  try {
    products = await api.get<PaginatedResponse<Product>>(
      `/api/products${buildQuery({
        category: slug,
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
      <nav className="text-xs text-ink-soft/70">
        <Link href="/" className="hover:text-gold">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span>{category.name}</span>
      </nav>

      <h1 className="mt-2 font-display text-3xl text-ink">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">{category.description}</p>
      )}

      {category.children && category.children.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="rounded-full border border-ink/15 px-3.5 py-1.5 text-xs text-ink-soft hover:border-gold hover:text-gold"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <ProductFilterBar />
      </div>

      {loadError ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-ink/10 py-16 text-center">
          <AlertTriangle size={24} className="text-gold" />
          <p className="text-sm text-ink-soft">
            We couldn&apos;t load products right now. Please try again in a moment.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <ProductGrid products={products.data} />
          <Pagination meta={products.meta} buildHref={buildHref} />
        </div>
      )}
    </div>
  );
}
