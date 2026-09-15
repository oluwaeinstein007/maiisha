"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { ProductImage } from "@/lib/types";

interface ImagesManagerProps {
  productId: number;
  images: ProductImage[];
  onChanged: () => void;
}

export function ImagesManager({ productId, images, onChanged }: ImagesManagerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      await api.postForm(`/api/admin/products/${productId}/images`, formData);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm("Remove this image?")) return;
    await api.delete(`/api/admin/images/${imageId}`);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Images</h2>
        <Button
          size="sm"
          variant="outline"
          loading={uploading}
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={14} /> Upload
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((image) => (
          <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg bg-ink/5">
            <Image src={image.url} alt={image.alt_text ?? ""} fill className="object-cover" />
            <button
              onClick={() => handleDelete(image.id)}
              className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 p-1.5 text-cream opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Delete image"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full text-sm text-ink-soft">No images uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
