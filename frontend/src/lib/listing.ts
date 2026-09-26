import { api, buildQuery } from "@/lib/api";
import { productQueryParams, type ListingScope } from "@/lib/productFilters";
import type { PaginatedResponse, Product, ProductFilterOptions } from "@/lib/types";

export type SearchQuery = Record<string, string | undefined>;

export interface ListingData {
  /** Null when the API couldn't be reached — the page shows an error rather than "no products". */
  products: PaginatedResponse<Product> | null;
  options: ProductFilterOptions | null;
}

/**
 * Loads a product listing (category, search or sale page) plus the filter
 * options for it in parallel. The two are independent: filters failing to
 * load shouldn't hide the products, so each degrades on its own.
 */
export async function loadListing(scope: ListingScope, query: SearchQuery): Promise<ListingData> {
  const page = Math.max(1, Math.floor(Number(query.page ?? "1")) || 1);
  const params = productQueryParams(scope, query);

  const [products, options] = await Promise.all([
    api.get<PaginatedResponse<Product>>(`/api/products${buildQuery({ ...params, page })}`).catch(() => null),
    api
      .get<ProductFilterOptions>(
        `/api/products/filters${buildQuery({
          category: params.category,
          brand: params.brand,
          search: params.search,
          on_sale: scope.onSaleOnly ? "1" : undefined,
        })}`,
      )
      .catch(() => null),
  ]);

  return { products, options };
}
