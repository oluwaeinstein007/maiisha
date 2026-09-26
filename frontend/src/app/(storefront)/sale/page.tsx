import type { Metadata } from "next";
import Link from "next/link";
import { loadListing } from "@/lib/listing";
import { getActiveSales } from "@/lib/sales";
import { describeWeekdays, formatSaleEnds } from "@/lib/sale";
import { ProductListing } from "@/components/product/listing/ProductListing";
import type { ActiveSale } from "@/lib/types";

export const metadata: Metadata = { title: "Sale" };

interface SalePageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function saleTiming(sale: ActiveSale): string | null {
  const days = describeWeekdays(sale.weekdays);
  return days ? `${days} only` : formatSaleEnds(sale.ends_at);
}

function saleCovers(sale: ActiveSale): string {
  if (sale.applies_to === "all") return "Everything";

  const parts = [
    ...sale.categories.map((c) => c.name),
    ...sale.brands.map((b) => b.name),
    ...(sale.products_count > 0
      ? [`${sale.products_count} chosen ${sale.products_count === 1 ? "style" : "styles"}`]
      : []),
  ];

  return parts.length > 0 ? parts.join(", ") : "Selected styles";
}

export default async function SalePage({ searchParams }: SalePageProps) {
  const query = await searchParams;
  const [sales, data] = await Promise.all([
    getActiveSales(),
    loadListing({ onSaleOnly: true }, query),
  ]);

  if (sales.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-ink">No sale on right now</h1>
        <p className="mt-3 text-sm text-ink-soft">
          Nothing is marked down at the moment — but new pieces land all the time.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-cream hover:bg-ink-soft"
        >
          Shop everything
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <h1 className="font-display text-3xl text-ink">Sale</h1>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sales.map((sale) => (
          <li key={sale.id} className="rounded-xl bg-ink p-5 text-cream">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-lg">{sale.name}</p>
              <p className="shrink-0 text-sm font-semibold text-gold">{sale.label}</p>
            </div>
            {sale.description && <p className="mt-1 text-sm text-cream/70">{sale.description}</p>}
            <p className="mt-3 text-xs text-cream/50">
              {saleCovers(sale)}
              {saleTiming(sale) && ` · ${saleTiming(sale)}`}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <ProductListing data={data} scope={{ onSaleOnly: true }} query={query} />
      </div>
    </div>
  );
}
