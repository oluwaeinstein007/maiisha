import Link from "next/link";
import type { PaginatedResponse } from "@/lib/types";

export function Pagination<T>({
  meta,
  buildHref,
}: {
  meta: PaginatedResponse<T>["meta"];
  buildHref: (page: number) => string;
}) {
  if (meta.last_page <= 1) return null;

  const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          scroll={false}
          className={
            page === meta.current_page
              ? "flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm text-cream"
              : "flex h-9 w-9 items-center justify-center rounded-full text-sm text-ink-soft hover:bg-ink/5"
          }
        >
          {page}
        </Link>
      ))}
    </nav>
  );
}
