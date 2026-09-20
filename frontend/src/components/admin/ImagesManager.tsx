"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { isUnoptimizedImage } from "@/lib/image";
import { Button } from "@/components/ui/Button";
import type { ProductImage } from "@/lib/types";

interface ImagesManagerProps {
  productId: number;
  images: ProductImage[];
  colours: string[];
  onChanged: () => void;
}

export function ImagesManager({ productId, images, colours, onChanged }: ImagesManagerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadColour, setUploadColour] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingColourFor, setSavingColourFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (uploadColour) formData.append("colour", uploadColour);
      await api.postForm(`/api/admin/products/${productId}/images`, formData);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const handleColourChange = async (imageId: number, colour: string) => {
    setSavingColourFor(imageId);
    setError(null);
    try {
      await api.patch(`/api/admin/images/${imageId}`, { colour: colour || null });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update image colour.");
    } finally {
      setSavingColourFor(null);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm("Remove this image?")) return;
    await api.delete(`/api/admin/images/${imageId}`);
    onChanged();
  };

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Images</h2>
        <div className="flex items-center gap-2">
          {colours.length > 0 && (
            <select
              value={uploadColour}
              onChange={(e) => setUploadColour(e.target.value)}
              aria-label="Colour for next upload"
              className="rounded-md border border-ink/20 bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-gold"
            >
              <option value="">No colour</option>
              {colours.map((colour) => (
                <option key={colour} value={colour}>
                  {colour}
                </option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            variant="outline"
            loading={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={14} /> Upload
          </Button>
        </div>
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

      {colours.length > 0 && (
        <p className="mt-2 text-xs text-ink-soft/70">
          Tag each photo with the variant colour it shows, so customers see the right photo when they
          pick that colour.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((image) => (
          <div key={image.id} className="group relative">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-ink/5">
              <Image
                src={image.url}
                alt={image.alt_text ?? ""}
                fill
                className="object-cover"
                unoptimized={isUnoptimizedImage(image.url)}
              />
              <button
                onClick={() => handleDelete(image.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 p-1.5 text-cream opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete image"
              >
                <Trash2 size={12} />
              </button>
            </div>
            {colours.length > 0 && (
              <select
                value={image.colour ?? ""}
                disabled={savingColourFor === image.id}
                onChange={(e) => handleColourChange(image.id, e.target.value)}
                aria-label={`Colour for image ${image.id}`}
                className="mt-1.5 w-full rounded-md border border-ink/20 bg-white px-1.5 py-1 text-xs text-ink outline-none focus:border-gold disabled:opacity-50"
              >
                <option value="">No colour</option>
                {colours.map((colour) => (
                  <option key={colour} value={colour}>
                    {colour}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
        {images.length === 0 && (
          <p className="col-span-full text-sm text-ink-soft">No images uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
