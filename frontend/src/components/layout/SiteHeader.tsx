"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { swrFetcherResource } from "@/lib/api";
import type { Category } from "@/lib/types";

export function SiteHeader() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { data: categories } = useSWR<Category[]>("/api/categories", swrFetcherResource);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button
          className="lg:hidden text-ink"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          className="font-display text-2xl tracking-wide text-ink shrink-0"
        >
          MAI<span className="text-gold">_</span>ISHA
        </Link>

        <nav className="hidden lg:flex items-center gap-6 ml-6">
          {categories?.slice(0, 7).map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="text-sm text-ink-soft hover:text-gold transition-colors"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={handleSearch}
          className="hidden md:flex items-center flex-1 max-w-sm ml-auto border border-ink/15 rounded-full px-3 py-1.5 bg-white focus-within:border-gold transition-colors"
        >
          <Search size={16} className="text-ink-soft shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-transparent px-2 text-sm outline-none placeholder:text-ink-soft/60"
          />
        </form>

        <div className="flex items-center gap-4 ml-auto md:ml-4">
          <Link
            href={user ? "/account" : "/login"}
            className="text-ink hover:text-gold transition-colors"
            aria-label="Account"
          >
            <User size={20} />
          </Link>
          <Link
            href="/cart"
            className="relative text-ink hover:text-gold transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-semibold text-ink">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-ink/10 bg-cream px-4 py-4 space-y-4">
          <form onSubmit={handleSearch} className="flex items-center border border-ink/15 rounded-full px-3 py-1.5 bg-white">
            <Search size={16} className="text-ink-soft shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full bg-transparent px-2 text-sm outline-none"
            />
          </form>
          <nav className="flex flex-col gap-3">
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="text-sm text-ink-soft hover:text-gold"
                onClick={() => setMenuOpen(false)}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
