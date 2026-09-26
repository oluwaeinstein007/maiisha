import type { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /**
   * How the column appears on phones, where each row becomes a card: the `title`
   * (first line), a `badge` beside it (status), `actions` along the bottom, or
   * — by default — a labelled `field`. From `md` up every column is a table cell.
   */
  card?: "title" | "badge" | "actions" | "field";
}

/**
 * A list that is a table where there's room for one and a stack of cards where
 * there isn't. A wide table on a phone means the important columns (status!)
 * sit off-screen behind a sideways scroll.
 */
export function ResponsiveTable<T>({
  rows,
  columns,
  getKey,
  empty,
}: {
  rows: T[];
  columns: TableColumn<T>[];
  getKey: (row: T) => string | number;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-ink/10 bg-white p-6 text-center text-sm text-ink-soft">{empty}</p>
    );
  }

  const title = columns.find((c) => c.card === "title") ?? columns[0];
  const badge = columns.find((c) => c.card === "badge");
  const actions = columns.find((c) => c.card === "actions");
  const fields = columns.filter((c) => c !== title && c !== badge && c !== actions);

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getKey(row)} className="rounded-xl border border-ink/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-words text-sm font-medium text-ink [&_a]:inline-flex [&_a]:min-h-10 [&_a]:items-center">
                {title.cell(row)}
              </div>
              {badge && <div className="shrink-0">{badge.cell(row)}</div>}
            </div>

            {fields.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {fields.map((column) => (
                  <div key={column.header} className="min-w-0">
                    <dt className="text-xs text-ink-soft/60">{column.header}</dt>
                    <dd className="text-ink">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}

            {actions && <div className="mt-2 flex justify-end">{actions.cell(row)}</div>}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-ink/10 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft/60">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className="px-4 py-3 font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rows.map((row) => (
              <tr key={getKey(row)} className="hover:bg-ink/5">
                {columns.map((column) => (
                  <td key={column.header} className="px-4 py-3 text-ink-soft">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
