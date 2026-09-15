import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { apiResource, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductDetail } from "@/components/product/ProductDetail";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    return await apiResource.get<Product>(`/api/products/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description ?? undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <nav className="text-xs text-ink-soft/70">
          <Link href="/" className="hover:text-gold">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/category/${product.category.slug}`} className="hover:text-gold">
            {product.category.name}
          </Link>
          <span className="mx-1.5">/</span>
          <span>{product.name}</span>
        </nav>
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
