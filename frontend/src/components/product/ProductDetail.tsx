"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { formatSaleEnds, savingPercent } from "@/lib/sale";
import { Button } from "@/components/ui/Button";
import { PriceTag } from "@/components/ui/PriceTag";
import { Stars } from "@/components/ui/Stars";
import { WishlistButton } from "@/components/product/WishlistButton";
import { StockAlertForm } from "@/components/product/StockAlertForm";
import { isUnoptimizedImage } from "@/lib/image";
import type { Product } from "@/lib/types";

export function ProductDetail({ product }: { product: Product }) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    variants[0]?.size ?? null,
  );
  const [selectedColour, setSelectedColour] = useState<string | null>(
    variants[0]?.colour ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const sizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size).filter((v): v is string => !!v))),
    [variants],
  );
  const colours = useMemo(
    () => Array.from(new Set(variants.map((v) => v.colour).filter((v): v is string => !!v))),
    [variants],
  );

  const selectedVariant = useMemo(() => {
    if (variants.length === 1) return variants[0];
    return variants.find(
      (v) =>
        (sizes.length === 0 || v.size === selectedSize) &&
        (colours.length === 0 || v.colour === selectedColour),
    );
  }, [variants, sizes, colours, selectedSize, selectedColour]);

  const price = selectedVariant?.price_pence ?? product.min_price_pence;
  const compareAt = selectedVariant
    ? selectedVariant.compare_at_price_pence
    : product.compare_at_price_pence;
  const saleEnds = formatSaleEnds(product.sale?.ends_at ?? null);
  const inStock = selectedVariant ? selectedVariant.in_stock && selectedVariant.is_active : false;
  const maxQuantity = selectedVariant?.stock_quantity ?? 0;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setStatus("adding");
    setError(null);
    try {
      await addItem(selectedVariant.id, quantity);
      setStatus("added");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Could not add to cart.");
    }
  };

  const imagesForColour = useMemo(() => {
    if (!selectedColour) return product.images;
    const matches = product.images.filter((img) => img.colour === selectedColour);
    return matches.length > 0 ? matches : product.images;
  }, [product.images, selectedColour]);

  const images =
    imagesForColour.length > 0 ? imagesForColour : [{ id: 0, url: "", alt_text: null, colour: null }];

  const [colourForActiveImage, setColourForActiveImage] = useState(selectedColour);
  if (selectedColour !== colourForActiveImage) {
    setColourForActiveImage(selectedColour);
    setActiveImage(0);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-ink/5">
          {images[activeImage]?.url ? (
            <Image
              src={images[activeImage].url}
              alt={images[activeImage].alt_text ?? product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
              unoptimized={isUnoptimizedImage(images[activeImage].url)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-soft/50">
              No image available
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveImage(idx)}
                aria-label={`Show photo ${idx + 1}`}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                  idx === activeImage ? "border-gold" : "border-ink/10"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt_text ?? product.name}
                  fill
                  className="object-cover"
                  unoptimized={isUnoptimizedImage(img.url)}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink-soft/60">
          {product.brand && (
            <>
              <Link
                href={`/brand/${product.brand.slug}`}
                className="inline-flex min-h-8 items-center font-medium text-ink-soft hover:text-gold"
              >
                {product.brand.name}
              </Link>
              <span className="mx-1.5">·</span>
            </>
          )}
          {product.category.name}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl text-ink">{product.name}</h1>
          <WishlistButton productId={product.id} className="shrink-0 border border-ink/10" />
        </div>
        {!!product.rating_count && product.rating_avg != null && (
          <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-xs text-ink-soft hover:text-gold">
            <Stars value={product.rating_avg} />
            {product.rating_avg} ({product.rating_count})
          </a>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <PriceTag
            price={price}
            compareAt={compareAt}
            className="text-ink"
            priceClassName="text-xl"
          />
          {compareAt != null && compareAt > price && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-ink">
              Save {savingPercent(compareAt, price)}%
            </span>
          )}
        </div>
        {product.sale && compareAt != null && (
          <p className="mt-1 text-xs text-ink-soft">
            {product.sale.name}
            {saleEnds && ` · ${saleEnds}`}
          </p>
        )}

        {product.description && (
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">{product.description}</p>
        )}

        {sizes.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-ink">Size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    selectedSize === size
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/20 text-ink hover:border-ink"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {colours.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-ink">Colour</p>
            <div className="flex flex-wrap gap-2">
              {colours.map((colour) => (
                <button
                  key={colour}
                  onClick={() => setSelectedColour(colour)}
                  className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                    selectedColour === colour
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/20 text-ink hover:border-ink"
                  }`}
                >
                  {colour}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          {selectedVariant ? (
            inStock ? (
              selectedVariant.low_stock && (
                <p className="text-xs font-medium text-amber-600">
                  Only {selectedVariant.stock_quantity} left in stock
                </p>
              )
            ) : (
              <p className="text-xs font-medium text-red-600">Out of stock</p>
            )
          ) : (
            <p className="text-xs text-ink-soft">Select options to see availability</p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center rounded-full border border-ink/20">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center text-ink-soft hover:text-ink"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxQuantity || 1, q + 1))}
              className="flex h-11 w-11 items-center justify-center text-ink-soft hover:text-ink"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!inStock || status === "adding"}
            loading={status === "adding"}
            size="lg"
            className="flex-1"
          >
            {status === "added" ? (
              <>
                <Check size={16} /> Added
              </>
            ) : inStock ? (
              "Add to cart"
            ) : (
              "Out of stock"
            )}
          </Button>
        </div>

        {product.in_stock === false && <StockAlertForm slug={product.slug} />}

        <p aria-live="polite" className="sr-only">
          {status === "added" ? "Item added to cart." : ""}
        </p>

        {error && (
          <p role="alert" aria-live="assertive" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!user && status === "added" && (
          <p className="mt-4 text-xs text-ink-soft">
            Item added to your cart. You&apos;ll need to{" "}
            <button onClick={() => router.push("/login")} className="underline hover:text-gold">
              sign in
            </button>{" "}
            to check out.
          </p>
        )}
      </div>
    </div>
  );
}
