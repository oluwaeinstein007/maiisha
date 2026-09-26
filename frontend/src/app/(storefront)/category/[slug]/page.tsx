import { notFound } from "next/navigation";
import Link from "next/link";
import { apiResource, ApiError } from "@/lib/api";
import { loadListing } from "@/lib/listing";
import type { Category } from "@/lib/types";
import { ProductListing } from "@/components/product/listing/ProductListing";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

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

  const scope = { category: slug };
  const data = await loadListing(scope, query);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft/70">
        <Link href="/" className="inline-flex min-h-10 items-center hover:text-gold">
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
        <div className="scrollbar-hide -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/category/${child.slug}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-ink/15 px-4 text-sm text-ink-soft hover:border-gold hover:text-gold"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ProductListing data={data} scope={scope} query={query} />
      </div>
    </div>
  );
}
