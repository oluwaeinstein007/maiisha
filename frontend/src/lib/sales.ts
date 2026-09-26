import { api } from "@/lib/api";
import type { ActiveSale } from "@/lib/types";

/** Sales running right now, for server components (banner, home, /sale). Never throws: a sale banner isn't worth a broken page. */
export async function getActiveSales(): Promise<ActiveSale[]> {
  try {
    const res = await api.get<{ data: ActiveSale[] }>("/api/sales/active");
    return res.data;
  } catch {
    return [];
  }
}

/** Client-side (SWR) fetcher for the same endpoint. */
export const activeSalesFetcher = (path: string) =>
  api.get<{ data: ActiveSale[] }>(path).then((res) => res.data);
