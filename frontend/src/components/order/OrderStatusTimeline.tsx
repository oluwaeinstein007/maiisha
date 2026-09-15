import { Check } from "lucide-react";
import clsx from "clsx";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        This order was cancelled.
      </div>
    );
  }

  if (status === "pending_payment") {
    return (
      <div className="rounded-md bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
        Awaiting payment confirmation.
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <ol className="flex items-center">
      {ORDER_STATUS_FLOW.map((step, idx) => {
        const done = idx <= currentIndex;
        const isLast = idx === ORDER_STATUS_FLOW.length - 1;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                  done ? "border-gold bg-gold text-ink" : "border-ink/20 text-ink-soft/50",
                )}
              >
                {done ? <Check size={14} /> : idx + 1}
              </span>
              <span
                className={clsx(
                  "text-[11px] whitespace-nowrap",
                  done ? "text-ink" : "text-ink-soft/50",
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <div className={clsx("mx-2 h-px flex-1", done && idx < currentIndex ? "bg-gold" : "bg-ink/10")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
