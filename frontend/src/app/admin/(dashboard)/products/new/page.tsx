"use client";

import { useRouter } from "next/navigation";
import { ProductBasicForm } from "@/components/admin/ProductBasicForm";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl text-ink">New product</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Save the basic details first, then add variants and images.
      </p>
      <div className="mt-6">
        <ProductBasicForm onSaved={(product) => router.push(`/admin/products/${product.id}`)} />
      </div>
    </div>
  );
}
