"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import clsx from "clsx";
import { swrFetcher, buildQuery } from "@/lib/api";
import type { AdminInventory } from "@/lib/types";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { QuickRestock } from "@/components/admin/QuickRestock";
import { Input } from "@/components/ui/Field";

type Status = "attention" | "out" | "low" | "all";

const STATUSES: Status[] = ["attention", "out", "low", "all"];

function parseStatus(value: string | null): Status {
  return STATUSES.includes(value as Status) ? (value as Status) : "attention";
}

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">Loading…</p>}>
      <AdminInventoryContent />
    </Suspense>
  );
}

function AdminInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-linked from the dashboard tiles: /admin/inventory?status=out
  const [status, setStatus] = useState<Status>(parseStatus(searchParams.get("status")));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, mutate } = useSWR<AdminInventory>(
    `/api/admin/inventory${buildQuery({ status, search, page, per_page: 20 })}`,
    swrFetcher,
    { keepPreviousData: true },
  );

  // Restocking can empty the last page of a filtered list; step back instead of showing "nothing here".
  const handleChanged = async () => {
    const fresh = await mutate();
    if (fresh && fresh.data.length === 0 && fresh.meta.current_page > fresh.meta.last_page) {
      setPage(Math.max(1, fresh.meta.last_page));
    }
  };

  const changeStatus = (next: Status) => {
    setStatus(next);
    setPage(1);
    router.replace(next === "attention" ? "/admin/inventory" : `/admin/inventory?status=${next}`, { scroll: false });
  };

  const chips: Array<{ status: Status; label: string; count: number | undefined }> = [
    { status: "attention", label: "Needs restocking", count: data ? data.counts.out + data.counts.low : undefined },
    { status: "out", label: "Out of stock", count: data?.counts.out },
    { status: "low", label: "Running low", count: data?.counts.low },
    { status: "all", label: "All variants", count: data?.counts.all },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Inventory</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Add stock as it arrives — most urgent first. Shoppers waiting on a sold-out item are emailed automatically when it comes back.
      </p>

      <div
        className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="group"
        aria-label="Filter by stock level"
      >
        {chips.map((chip) => (
          <button
            key={chip.status}
            type="button"
            aria-pressed={status === chip.status}
            onClick={() => changeStatus(chip.status)}
            className={clsx(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              status === chip.status ? "bg-ink text-cream" : "bg-ink/5 text-ink-soft hover:bg-ink/10",
            )}
          >
            {chip.label}
            {chip.count !== undefined && <span className="tabular-nums opacity-70">{chip.count}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-sm">
        <Input
          type="search"
          aria-label="Search inventory"
          placeholder="Search by product name or SKU…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-4 rounded-xl border border-ink/10 bg-white px-4 sm:px-5">
        {!data ? (
          <p className="py-4 text-sm text-ink-soft">Loading…</p>
        ) : data.data.length === 0 ? (
          <p className="py-4 text-sm text-ink-soft">
            {search ? "No variants match that search." : "Nothing here — everything is well stocked."}
          </p>
        ) : (
          <QuickRestock rows={data.data} onChanged={handleChanged} />
        )}
      </div>

      {data && <PaginationControls page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
    </div>
  );
}
