"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Bell, Clock3, PackageX, ShoppingBag, Tag } from "lucide-react";
import { formatRelativeTime } from "@/lib/money";
import { useAdminNotifications } from "@/lib/useAdminNotifications";
import type { AdminNotification, AdminNotificationType } from "@/lib/types";

const ICONS: Record<AdminNotificationType, typeof Bell> = {
  order: ShoppingBag,
  low_stock: AlertTriangle,
  out_of_stock: PackageX,
  stale_checkout: Clock3,
  sale: Tag,
};

const ICON_STYLES: Record<AdminNotificationType, string> = {
  order: "bg-green-100 text-green-700",
  low_stock: "bg-amber-100 text-amber-700",
  out_of_stock: "bg-red-100 text-red-700",
  stale_checkout: "bg-neutral-200 text-neutral-600",
  sale: "bg-gold-soft/60 text-gold-deep",
};

/**
 * The admin notification bell: new orders, stock alerts, stale checkouts, sales
 * ending soon — see `NotificationController` for how the feed is put together.
 * Opening the panel clears the unread badge, but items stay visually "new" for
 * the rest of this open (`justRead`) so the admin can still tell what came in
 * since they last looked, rather than everything flattening the instant it opens.
 */
export function NotificationBell() {
  const { notifications, unreadCount, markRead } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const [justRead, setJustRead] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && unreadCount > 0) {
      setJustRead(new Set(notifications.filter((n) => n.unread).map((n) => n.id)));
      markRead();
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-ink/10 bg-white shadow-xl sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <h2 className="font-display text-base text-ink">Notifications</h2>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">Nothing to show right now.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-ink/5 overflow-y-auto">
              {notifications.map((item) => (
                <NotificationRow key={item.id} item={item} highlighted={justRead.has(item.id)} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  highlighted,
  onNavigate,
}: {
  item: AdminNotification;
  highlighted: boolean;
  onNavigate: () => void;
}) {
  const Icon = ICONS[item.type];
  const unread = item.unread || highlighted;

  return (
    <li>
      <Link
        href={item.link}
        onClick={onNavigate}
        className={clsx("flex min-h-16 items-start gap-3 px-4 py-3 transition-colors hover:bg-ink/5", unread && "bg-gold-soft/10")}
      >
        <span className={clsx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", ICON_STYLES[item.type])}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={clsx("text-sm", unread ? "font-semibold text-ink" : "font-medium text-ink-soft")}>{item.title}</span>
            <span className="shrink-0 text-[11px] text-ink-soft/60">{formatRelativeTime(item.created_at)}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-soft">{item.message}</span>
        </span>
        {unread && <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />}
      </Link>
    </li>
  );
}
