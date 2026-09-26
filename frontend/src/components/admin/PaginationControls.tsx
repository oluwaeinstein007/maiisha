import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/components/ui/Pagination";

const CELL = "flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm";

/** Page buttons for the admin lists: windowed (never a row of 40 numbers) with 40px targets. */
export function PaginationControls({
  page,
  lastPage,
  onChange,
}: {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1 sm:gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
        className={clsx(CELL, "text-ink hover:bg-ink/5 disabled:text-ink/20 disabled:hover:bg-transparent")}
      >
        <ChevronLeft size={18} />
      </button>

      {pageWindow(page, lastPage).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className={clsx(CELL, "text-ink-soft/50")}>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={clsx(CELL, item === page ? "bg-ink text-cream" : "text-ink-soft hover:bg-ink/5")}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={page >= lastPage}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
        className={clsx(CELL, "text-ink hover:bg-ink/5 disabled:text-ink/20 disabled:hover:bg-transparent")}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
