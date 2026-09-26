import { Check } from "lucide-react";
import clsx from "clsx";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import type { OrderStatus } from "@/lib/types";

/**
 * Vertical on phones (five labelled steps don't fit side by side on a 375px
 * screen), horizontal from `sm` up.
 */
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
    <ol className="flex flex-col sm:flex-row sm:items-center">
      {ORDER_STATUS_FLOW.map((step, idx) => {
        const done = idx <= currentIndex;
        const isLast = idx === ORDER_STATUS_FLOW.length - 1;
        return (
          <li
            key={step}
            aria-current={idx === currentIndex ? "step" : undefined}
            className="relative flex pb-6 last:pb-0 sm:flex-1 sm:items-center sm:pb-0 sm:last:flex-none"
          >
            <div className="flex items-center gap-3 sm:flex-col sm:gap-1.5">
              <span
                className={clsx(
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                  done ? "border-gold bg-gold text-ink" : "border-ink/20 bg-white text-ink-soft/50",
                )}
              >
                {done ? <Check size={14} /> : idx + 1}
              </span>
              <span
                className={clsx(
                  "text-sm sm:whitespace-nowrap sm:text-[11px]",
                  done ? "text-ink" : "text-ink-soft/60",
                )}
              >
                {ORDER_STATUS_LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <div
                aria-hidden="true"
                className={clsx(
                  "absolute bottom-0 left-[13px] top-7 w-px sm:static sm:mx-2 sm:h-px sm:w-auto sm:flex-1",
                  done && idx < currentIndex ? "bg-gold" : "bg-ink/10",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
