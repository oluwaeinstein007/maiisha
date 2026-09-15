import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-display text-xl tracking-wide">
              MAI<span className="text-gold">_</span>ISHA
            </p>
            <p className="mt-3 text-sm text-cream/60">
              Fashion &amp; Beauty Sphere. Premium pieces, delivered across the UK.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gold">Shop</p>
            <ul className="mt-3 space-y-2 text-sm text-cream/70">
              <li>
                <Link href="/" className="hover:text-gold">
                  All products
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-gold">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gold">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-cream/70">
              <li>
                <Link href="/account/orders" className="hover:text-gold">
                  Order tracking
                </Link>
              </li>
              <li>
                <Link href="/account/addresses" className="hover:text-gold">
                  Addresses
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-gold">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-gold">Support</p>
            <ul className="mt-3 space-y-2 text-sm text-cream/70">
              <li>Delivery: Royal Mail, DPD, Evri, DHL</li>
              <li>UK VAT included at checkout</li>
              <li>Secure payments by Stripe</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/10 pt-6 text-xs text-cream/50">
          © {new Date().getFullYear()} MAI_ISHA. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
