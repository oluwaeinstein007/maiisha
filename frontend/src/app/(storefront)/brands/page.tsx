import type { Metadata } from "next";
import Link from "next/link";
import { apiResource } from "@/lib/api";
import type { Brand } from "@/lib/types";
import { BrandMark } from "@/components/brand/BrandMark";

export const metadata: Metadata = { title: "Brands" };

async function getBrands(): Promise<Brand[] | null> {
  try {
    return await apiResource.get<Brand[]>("/api/brands");
  } catch {
    return null;
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="font-display text-3xl text-ink">Brands</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-soft">Shop by the labels you love.</p>

      {brands === null && (
        <p className="mt-10 text-sm text-ink-soft">We couldn&apos;t load the brands right now. Please try again in a moment.</p>
      )}
      {brands?.length === 0 && <p className="mt-10 text-sm text-ink-soft">No brands to show yet.</p>}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands?.map((brand) => (
          <li key={brand.id}>
            <Link
              href={`/brand/${brand.slug}`}
              className="flex h-full items-center gap-4 rounded-xl border border-ink/10 p-4 transition-colors hover:border-gold sm:p-5"
            >
              <BrandMark name={brand.name} logoUrl={brand.logo_url} />
              <span className="min-w-0">
                <span className="block font-display text-lg text-ink">{brand.name}</span>
                {brand.description && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{brand.description}</span>}
                <span className="mt-1 block text-xs text-ink-soft/60">
                  {brand.products_count} {brand.products_count === 1 ? "product" : "products"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
