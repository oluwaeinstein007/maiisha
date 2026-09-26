import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

async function getRelated(slug: string): Promise<Product[]> {
  try {
    const res = await api.get<{ data: Product[] }>(`/api/products/${slug}/related?limit=4`);
    return res.data;
  } catch {
    return [];
  }
}

export async function RelatedProducts({ slug }: { slug: string }) {
  const products = await getRelated(slug);
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <h2 className="mb-6 font-serif text-2xl text-ink">You may also like</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
