"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { swrFetcherResource } from "@/lib/api";
import { ProductBasicForm } from "@/components/admin/ProductBasicForm";
import { VariantsManager } from "@/components/admin/VariantsManager";
import { ImagesManager } from "@/components/admin/ImagesManager";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data: product, mutate } = useSWR<Product>(
    `/api/admin/products/${params.id}`,
    swrFetcher,
  );

  if (!product) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">{product.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">Edit product details, variants and images.</p>
      </div>

      <ProductBasicForm product={product} onSaved={() => mutate()} />

      <VariantsManager
        productId={product.id}
        variants={product.variants ?? []}
        onChanged={() => mutate()}
      />

      <ImagesManager productId={product.id} images={product.images} onChanged={() => mutate()} />
    </div>
  );
}
