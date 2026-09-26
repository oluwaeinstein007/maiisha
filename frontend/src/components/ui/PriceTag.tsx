import clsx from "clsx";
import { formatPence } from "@/lib/money";

interface PriceTagProps {
  price: number;
  /** The normal price while a sale is on — shown struck through. */
  compareAt?: number | null;
  className?: string;
  priceClassName?: string;
}

/**
 * A price, with the pre-sale price struck through beside it when there is one.
 * The struck price is only a visual cue, so screen readers get it spelled out.
 */
export function PriceTag({ price, compareAt, className, priceClassName }: PriceTagProps) {
  const onSale = compareAt != null && compareAt > price;

  return (
    <span className={clsx("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={clsx(onSale && "font-semibold text-ink", priceClassName)}>
        {onSale && <span className="sr-only">Now </span>}
        {formatPence(price)}
      </span>
      {onSale && (
        <s className="text-[0.85em] text-ink-soft/60">
          <span className="sr-only">Was </span>
          {formatPence(compareAt)}
        </s>
      )}
    </span>
  );
}
