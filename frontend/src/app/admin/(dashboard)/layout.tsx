"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  Award,
  Boxes,
  BadgePercent,
  ChartColumn,
  ExternalLink,
  Flame,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  ShoppingCart,
  Tag,
  Users,
  X,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/context/AuthContext";
import { useDialog } from "@/lib/useDialog";
import { NotificationBell } from "@/components/admin/NotificationBell";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Award },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/demand", label: "Demand", icon: Flame },
  { href: "/admin/sales", label: "Sales", icon: BadgePercent },
  { href: "/admin/discount-codes", label: "Discount codes", icon: Tag },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth admin>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
              active ? "bg-gold text-ink" : "text-cream/70 hover:bg-white/5 hover:text-cream",
            )}
          >
            <Icon size={16} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFooter({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <div className="border-t border-white/10 px-3 py-4">
      <p className="truncate px-3 text-xs text-cream/50">{email}</p>
      <Link
        href="/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-cream/70 hover:bg-white/5 hover:text-cream"
      >
        <ExternalLink size={16} aria-hidden="true" />
        View shop
      </Link>
      <button
        onClick={onSignOut}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-cream/70 hover:bg-white/5 hover:text-cream"
      >
        <LogOut size={16} aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}

/** Slide-in navigation for phones and tablets; mounted only while open. */
function MobileNav({
  pathname,
  email,
  onClose,
  onSignOut,
}: {
  pathname: string;
  email?: string;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const { dialogRef, initialFocusRef, onKeyDown } = useDialog(onClose);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="animate-drawer-in absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink text-cream shadow-2xl"
      >
        <div className="flex items-center justify-between py-2 pl-6 pr-2">
          <div>
            <p className="font-display text-xl tracking-wide">
              MAI<span className="text-gold">_</span>ISHA
            </p>
            <p className="text-xs text-cream/50">Admin</p>
          </div>
          <button
            ref={initialFocusRef}
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-cream hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          <NavLinks pathname={pathname} onNavigate={onClose} />
        </div>

        <AccountFooter email={email} onSignOut={onSignOut} />
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer when the page changes (derived during render, so it never flashes stale).
  const [openOnPath, setOpenOnPath] = useState(pathname);
  if (pathname !== openOnPath) {
    setOpenOnPath(pathname);
    setMenuOpen(false);
  }

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-ink text-cream lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-6 py-6">
          <p className="font-display text-xl tracking-wide">
            MAI<span className="text-gold">_</span>ISHA
          </p>
          <p className="mt-0.5 text-xs text-cream/50">Admin</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks pathname={pathname} />
        </div>

        <AccountFooter email={user?.email} onSignOut={handleLogout} />
      </aside>

      {/* min-w-0 is the important bit: without it this flex child grows to fit its widest
          descendant (a table, a scrolling nav strip) instead of staying inside the viewport. */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-1 border-b border-ink/10 bg-white px-2 py-2 lg:hidden">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
            >
              <Menu size={22} />
            </button>
            <p className="font-display text-lg text-ink">
              MAI<span className="text-gold">_</span>ISHA <span className="text-sm text-ink-soft">Admin</span>
            </p>
          </div>
          <NotificationBell />
        </header>

        <div className="sticky top-0 z-30 hidden items-center justify-end border-b border-ink/10 bg-white px-6 py-2 lg:flex">
          <NotificationBell />
        </div>

        <main id="main-content" className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {menuOpen && (
        <MobileNav
          pathname={pathname}
          email={user?.email}
          onClose={() => setMenuOpen(false)}
          onSignOut={handleLogout}
        />
      )}
    </div>
  );
}
