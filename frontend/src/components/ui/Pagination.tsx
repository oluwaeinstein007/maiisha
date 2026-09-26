import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginatedResponse } from "@/lib/types";

/** First, last, and a window around the current page — the rest collapse to "…". */
export function pageWindow(current: number, last: number): Array<number | "gap"> {
  const wanted = new Set([1, last, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);

  const items: Array<number | "gap"> = [];
  pages.forEach((page, i) => {
    if (i > 0 && page - pages[i - 1] > 1) items.push("gap");
    items.push(page);
  });
  return items;
}

const CELL = "flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm";

export function Pagination<T>({
  meta,
  buildHref,
}: {
  meta: PaginatedResponse<T>["meta"];
  buildHref: (page: number) => string;
}) {
  if (meta.last_page <= 1) return null;

  const { current_page: current, last_page: last } = meta;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1 sm:gap-2">
      {current > 1 ? (
        <Link href={buildHref(current - 1)} scroll={false} aria-label="Previous page" className={clsx(CELL, "text-ink hover:bg-ink/5")}>
          <ChevronLeft size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className={clsx(CELL, "text-ink/20")}>
          <ChevronLeft size={18} />
        </span>
      )}

      {pageWindow(current, last).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className={clsx(CELL, "text-ink-soft/50")}>
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            scroll={false}
            aria-label={`Page ${item}`}
            aria-current={item === current ? "page" : undefined}
            className={clsx(CELL, item === current ? "bg-ink text-cream" : "text-ink-soft hover:bg-ink/5")}
          >
            {item}
          </Link>
        ),
      )}

      {current < last ? (
        <Link href={buildHref(current + 1)} scroll={false} aria-label="Next page" className={clsx(CELL, "text-ink hover:bg-ink/5")}>
          <ChevronRight size={18} />
        </Link>
      ) : (
        <span aria-hidden="true" className={clsx(CELL, "text-ink/20")}>
          <ChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}
