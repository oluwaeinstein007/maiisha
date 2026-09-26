import { loadListing } from "@/lib/listing";
import { ProductListing } from "@/components/product/listing/ProductListing";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const data = await loadListing({}, query);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="font-display text-3xl text-ink">
        {query.q ? `Results for “${query.q}”` : "All products"}
      </h1>

      <div className="mt-6">
        <ProductListing data={data} scope={{}} query={query} />
      </div>
    </div>
  );
}
