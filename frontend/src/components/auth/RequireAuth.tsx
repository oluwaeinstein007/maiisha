"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export function RequireAuth({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;

    const loginPath = admin ? "/admin/login" : "/login";
    router.replace(`${loginPath}?redirect=${encodeURIComponent(pathname)}`);
  }, [user, loading, admin, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  // Signed in, but with a customer account. Quietly bouncing them to the shop
  // made /admin look broken ("why does this redirect?") — say what's happening
  // and offer the way out instead.
  if (admin && user.role !== "admin") {
    const switchAccount = async () => {
      await logout();
      router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-6">
        <div role="alert" className="max-w-md text-center">
          <ShieldAlert size={32} className="mx-auto text-gold-deep" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl text-ink">Admin access only</h1>
          <p className="mt-3 text-sm text-ink-soft">
            You&apos;re signed in as <span className="font-medium text-ink">{user.email}</span>, which
            isn&apos;t an admin account.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={switchAccount}>Sign in as an admin</Button>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to the shop
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
