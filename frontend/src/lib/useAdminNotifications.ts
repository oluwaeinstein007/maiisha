import useSWR from "swr";
import { api, swrFetcher } from "@/lib/api";
import type { AdminNotificationFeed } from "@/lib/types";

/** Polled, not pushed — the bell is exactly as current as the last 30s poll, which is fine for a founder-run shop. */
const POLL_INTERVAL_MS = 30_000;

export function useAdminNotifications() {
  const { data, mutate } = useSWR<AdminNotificationFeed>("/api/admin/notifications", swrFetcher, {
    refreshInterval: POLL_INTERVAL_MS,
  });

  const markRead = async () => {
    if (!data) return;

    // Optimistic: the bell clears the instant it's opened, not 30s later on the next poll.
    const cleared: AdminNotificationFeed = {
      ...data,
      unread_count: 0,
      notifications: data.notifications.map((n) => ({ ...n, unread: false })),
    };
    await mutate(cleared, { revalidate: false });

    try {
      await api.post("/api/admin/notifications/read");
    } catch {
      // The optimistic clear was wrong — re-fetch to find out what's actually unread.
      mutate();
    }
  };

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unread_count ?? 0,
    loading: !data,
    markRead,
  };
}
