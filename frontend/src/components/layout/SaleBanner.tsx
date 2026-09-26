import Link from "next/link";
import { getActiveSales } from "@/lib/sales";
import { describeWeekdays, formatSaleEnds } from "@/lib/sale";

/** Announcement strip above the header while a sale is running. Renders nothing otherwise. */
export async function SaleBanner() {
  const sales = await getActiveSales();
  if (sales.length === 0) return null;

  const [first, ...others] = sales;
  const weekdays = describeWeekdays(first.weekdays);
  const timing = weekdays ? `${weekdays} only` : formatSaleEnds(first.ends_at);

  return (
    <div className="bg-ink text-cream">
      <Link
        href="/sale"
        className="mx-auto flex min-h-10 max-w-7xl flex-wrap items-center justify-center gap-x-2 px-4 py-2 text-center text-xs leading-snug hover:text-gold-soft sm:text-sm"
      >
        <span className="font-semibold uppercase tracking-wide text-gold">{first.name}</span>
        <span className="text-cream/80">{first.description ?? first.label}</span>
        {timing && <span className="hidden text-cream/50 sm:inline">· {timing}</span>}
        {others.length > 0 && (
          <span className="hidden text-cream/50 md:inline">· +{others.length} more</span>
        )}
        <span aria-hidden="true" className="text-gold">
          →
        </span>
      </Link>
    </div>
  );
}
