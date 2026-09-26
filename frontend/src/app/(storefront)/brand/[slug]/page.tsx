import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { apiResource, ApiError } from "@/lib/api";
import { loadListing } from "@/lib/listing";
import type { Brand } from "@/lib/types";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProductListing } from "@/components/product/listing/ProductListing";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

async function getBrand(slug: string): Promise<Brand | null> {
  try {
    return await apiResource.get<Brand>(`/api/brands/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: Pick<BrandPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug).catch(() => null);
  return { title: brand?.name ?? "Brand" };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const brand = await getBrand(slug);
  if (!brand) notFound();

  const scope = { brand: slug };
  const data = await loadListing(scope, query);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft/70">
        <Link href="/" className="inline-flex min-h-10 items-center hover:text-gold">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/brands" className="inline-flex min-h-10 items-center hover:text-gold">
          Brands
        </Link>
        <span className="mx-1.5">/</span>
        <span>{brand.name}</span>
      </nav>

      <div className="mt-2 flex items-center gap-4">
        <BrandMark name={brand.name} logoUrl={brand.logo_url} className="h-16 w-16 sm:h-20 sm:w-20" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-ink">{brand.name}</h1>
          {brand.description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{brand.description}</p>}
        </div>
      </div>

      <div className="mt-8">
        <ProductListing data={data} scope={scope} query={query} />
      </div>
    </div>
  );
}
