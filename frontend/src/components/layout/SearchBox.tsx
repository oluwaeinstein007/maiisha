"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { Search } from "lucide-react";
import { api, buildQuery } from "@/lib/api";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { formatPence } from "@/lib/money";
import type { PaginatedResponse, Product } from "@/lib/types";

const suggestFetcher = (path: string) => api.get<PaginatedResponse<Product>>(path).then((r) => r.data);

export function SearchBox({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const shouldFetch = open && debouncedQuery.length >= 2;
  const { data: suggestions, isLoading } = useSWR(
    shouldFetch ? `/api/products${buildQuery({ search: debouncedQuery, per_page: 5 })}` : null,
    suggestFetcher,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToResults = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
    onNavigate?.();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    goToResults();
  };

  const handleSelect = (slug: string) => {
    router.push(`/product/${slug}`);
    setOpen(false);
    setQuery("");
    onNavigate?.();
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center border border-ink/15 rounded-full px-3 py-1.5 bg-white focus-within:border-gold transition-colors"
      >
        <Search size={16} className="text-ink-soft shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search products…"
          className="w-full bg-transparent px-2 text-sm outline-none placeholder:text-ink-soft/60"
        />
      </form>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-ink/10 bg-white shadow-lg">
          {isLoading ? (
            <p className="px-4 py-3 text-xs text-ink-soft">Searching…</p>
          ) : suggestions && suggestions.length > 0 ? (
            <>
              <ul className="divide-y divide-ink/5">
                {suggestions.map((product) => (
                  <li key={product.id}>
                    <button
                      onClick={() => handleSelect(product.slug)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink/5"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-ink/5">
                        {product.images[0] && (
                          <Image
                            src={product.images[0].url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{product.name}</span>
                        <span className="block text-xs text-ink-soft">
                          {formatPence(product.min_price_pence)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={goToResults}
                className="block w-full border-t border-ink/10 px-4 py-2.5 text-center text-xs font-medium text-ink-soft hover:text-gold"
              >
                See all results for “{query.trim()}”
              </button>
            </>
          ) : (
            <p className="px-4 py-3 text-xs text-ink-soft">
              No products found for “{debouncedQuery}”.{" "}
              <Link href="/search" className="underline hover:text-gold" onClick={() => setOpen(false)}>
                Browse all
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
