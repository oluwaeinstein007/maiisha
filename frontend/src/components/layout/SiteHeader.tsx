"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { swrFetcherResource } from "@/lib/api";
import { activeSalesFetcher } from "@/lib/sales";
import { SearchBox } from "@/components/layout/SearchBox";
import type { ActiveSale, Category } from "@/lib/types";

const ICON_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:text-gold";

export function SiteHeader() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const { data: categories } = useSWR<Category[]>("/api/categories", swrFetcherResource);
  const { data: sales } = useSWR<ActiveSale[]>("/api/sales/active", activeSalesFetcher);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close the mobile menu/search whenever the page changes (derived during
  // render rather than in an effect, so there's no flash of the stale panel).
  const [openOnPath, setOpenOnPath] = useState(pathname);
  if (pathname !== openOnPath) {
    setOpenOnPath(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  // Publish the header's height so sticky elements beneath it (the product
  // filter toolbar) can sit flush under it whatever it's currently showing.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const publish = () =>
      document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // A full-height menu shouldn't let the page scroll behind it; Esc closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const onSale = (sales?.length ?? 0) > 0;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-2 py-2 sm:gap-3 sm:px-6 lg:px-8">
        <button
          className={clsx(ICON_BUTTON, "lg:hidden")}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => {
            setMenuOpen((open) => !open);
            setSearchOpen(false);
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center px-1 font-display text-xl tracking-wide text-ink sm:text-2xl"
        >
          MAI<span className="text-gold">_</span>ISHA
        </Link>

        <SearchBox className="ml-6 hidden max-w-md flex-1 md:block" />

        <div className="ml-auto flex items-center md:ml-4">
          <button
            className={clsx(ICON_BUTTON, "md:hidden")}
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open);
              setMenuOpen(false);
            }}
          >
            <Search size={20} />
          </button>
          <Link
            href={user ? "/account" : "/login"}
            className={ICON_BUTTON}
            aria-label={user ? "Your account" : "Sign in"}
          >
            <User size={20} />
          </Link>
          <Link
            href={user ? "/account/wishlist" : "/login"}
            className={clsx(ICON_BUTTON, "hidden sm:flex")}
            aria-label="Wishlist"
          >
            <Heart size={20} />
          </Link>
          <Link href="/cart" className={clsx(ICON_BUTTON, "relative")} aria-label="Cart">
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink"
              >
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {itemCount > 0 ? `Cart has ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}
      </p>

      {searchOpen && (
        <div className="border-t border-ink/10 px-4 py-3 md:hidden">
          <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {((categories && categories.length > 0) || onSale) && (
        <nav aria-label="Categories" className="hidden border-t border-ink/10 lg:block">
          <div className="scrollbar-hide mx-auto flex max-w-7xl gap-7 overflow-x-auto px-4 py-2.5 sm:px-6 lg:px-8">
            {onSale && (
              <Link
                href="/sale"
                className="whitespace-nowrap text-sm font-semibold text-gold-deep transition-colors hover:text-ink"
              >
                Sale
              </Link>
            )}
            <Link href="/brands" className="whitespace-nowrap text-sm text-ink-soft transition-colors hover:text-gold">
              Brands
            </Link>
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="whitespace-nowrap text-sm text-ink-soft transition-colors hover:text-gold"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {menuOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--header-h,3.5rem))] overflow-y-auto overscroll-contain border-t border-ink/10 bg-cream px-4 pb-8 pt-2 shadow-lg lg:hidden"
        >
          <nav aria-label="Shop" className="flex flex-col">
            {onSale && (
              <Link
                href="/sale"
                className="flex min-h-12 items-center border-b border-ink/10 text-base font-semibold text-gold-deep"
              >
                Sale
              </Link>
            )}
            <Link href="/brands" className="flex min-h-12 items-center border-b border-ink/10 text-base text-ink hover:text-gold">
              Brands
            </Link>
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex min-h-12 items-center border-b border-ink/10 text-base text-ink hover:text-gold"
              >
                {category.name}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col text-sm text-ink-soft">
            <Link href={user ? "/account" : "/login"} className="flex min-h-11 items-center hover:text-gold">
              {user ? "My account" : "Sign in / Register"}
            </Link>
            <Link href="/account/orders" className="flex min-h-11 items-center hover:text-gold">
              Track an order
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
