import Link from "next/link";
import { api, apiResource, buildQuery } from "@/lib/api";
import type { Category, PaginatedResponse, Product } from "@/lib/types";
import { ProductGrid } from "@/components/product/ProductCard";
import { getActiveSales } from "@/lib/sales";

async function getCategories(): Promise<Category[]> {
  try {
    return await apiResource.get<Category[]>("/api/categories");
  } catch {
    return [];
  }
}

async function getProducts(): Promise<Product[]> {
  try {
    const res = await api.get<PaginatedResponse<Product>>(
      `/api/products${buildQuery({ sort: "latest", per_page: 12 })}`,
    );
    return res.data;
  } catch {
    return [];
  }
}

async function getSaleProducts(): Promise<Product[]> {
  try {
    const res = await api.get<PaginatedResponse<Product>>(
      `/api/products${buildQuery({ on_sale: 1, sort: "discount", per_page: 4 })}`,
    );
    return res.data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [categories, products, sales, saleProducts] = await Promise.all([
    getCategories(),
    getProducts(),
    getActiveSales(),
    getSaleProducts(),
  ]);
  const featured = products.filter((p) => p.is_featured);
  const newIn = products.slice(0, 8);

  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">
            Fashion &amp; Beauty Sphere
          </p>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Premium style, curated for you.
          </h1>
          <p className="mt-5 max-w-lg text-sm text-cream/70 sm:text-base">
            Hair, fashion, activewear, modest wear, beauty and more — shipped
            across the UK.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center rounded-full bg-gold px-7 text-sm font-medium text-ink transition-colors hover:bg-gold-soft"
            >
              Shop now
            </Link>
            {sales.length > 0 && (
              <Link
                href="/sale"
                className="inline-flex min-h-12 items-center rounded-full border border-gold/60 px-7 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-ink"
              >
                Shop the sale
              </Link>
            )}
          </div>
        </div>
      </section>

      {saleProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-ink">
                {sales.length === 1 ? sales[0].name : "On sale now"}
              </h2>
              {sales.length === 1 && sales[0].description && (
                <p className="mt-1 text-sm text-ink-soft">{sales[0].description}</p>
              )}
            </div>
            <Link href="/sale" className="shrink-0 py-2 text-sm text-ink-soft hover:text-gold">
              Shop the sale
            </Link>
          </div>
          <div className="mt-6">
            <ProductGrid products={saleProducts} />
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl text-ink">Shop by category</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories
              .filter((c) => !c.parent_id)
              .map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-ink/10 p-5 text-center transition-colors hover:border-gold"
                >
                  <span className="text-sm font-medium text-ink group-hover:text-gold">
                    {category.name}
                  </span>
                </Link>
              ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-ink">Featured</h2>
            <Link href="/search" className="py-2 text-sm text-ink-soft hover:text-gold">
              View all
            </Link>
          </div>
          <div className="mt-6">
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-ink">New in</h2>
          <Link href="/search" className="py-2 text-sm text-ink-soft hover:text-gold">
            View all
          </Link>
        </div>
        <div className="mt-6">
          <ProductGrid products={newIn} />
        </div>
      </section>
    </div>
  );
}
