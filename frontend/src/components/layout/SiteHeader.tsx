"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { swrFetcherResource } from "@/lib/api";
import { SearchBox } from "@/components/layout/SearchBox";
import type { Category } from "@/lib/types";

export function SiteHeader() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { data: categories } = useSWR<Category[]>("/api/categories", swrFetcherResource);
  const [menuOpen, setMenuOpen] = useState(false);

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

        <Link href="/" className="font-display text-2xl tracking-wide text-ink shrink-0">
          MAI<span className="text-gold">_</span>ISHA
        </Link>

        <SearchBox className="hidden md:block flex-1 max-w-md ml-6" />

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

      {categories && categories.length > 0 && (
        <nav className="hidden lg:block border-t border-ink/10">
          <div className="scrollbar-hide mx-auto flex max-w-7xl gap-7 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="whitespace-nowrap text-sm text-ink-soft hover:text-gold transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {menuOpen && (
        <div className="lg:hidden border-t border-ink/10 bg-cream px-4 py-4 space-y-4">
          <SearchBox onNavigate={() => setMenuOpen(false)} />
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
