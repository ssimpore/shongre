import React from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export interface DataTableColumn<T> {
  /** Stable key, also used as the label on the stacked mobile layout. */
  id: string;
  /** Column header. */
  header: React.ReactNode;
  /** Cell renderer. */
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  /**
   * Marks the column that identifies the row. On mobile it becomes the row's
   * title instead of a label/value pair. Exactly one column should set this.
   */
  isRowTitle?: boolean;
  /** Hide this column in the table layout (still shown in the stacked layout). */
  hideInTable?: boolean;
  /** Hide this column in the stacked layout (still shown in the table). */
  hideInStack?: boolean;
  /** Extra classes for the cell. */
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Accessible description of the table's contents. */
  caption: string;
  /** Rendered instead of the table when `rows` is empty. */
  empty?: React.ReactNode;
  /**
   * Optional domain-specific compact row. Operational records do not always
   * read well as a generic label/value grid on phones; callers can provide a
   * tighter hierarchy while the desktop table keeps using the same columns.
   */
  renderCompactRow?: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Operational list rendered as a real table on desktop and as compact stacked
 * rows on phones.
 *
 * Pro and account workspaces previously rendered tabular data (status, price,
 * views, date, actions) as card stacks at every width, which wasted desktop
 * space and made rows hard to compare. Horizontal scrolling was not an
 * acceptable mobile fallback either, so below `md` each row collapses into a
 * labelled block keyed off the `isRowTitle` column.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  empty,
  renderCompactRow,
  className = "",
}: DataTableProps<T>) {
  const isCompact = !useMediaQuery("(min-width: 768px)");

  if (rows.length === 0) return <>{empty ?? null}</>;

  if (isCompact) {
    const titleColumn = columns.find((c) => c.isRowTitle);
    const detailColumns = columns.filter(
      (c) => !c.isRowTitle && !c.hideInStack,
    );

    return (
      <ul
        className={`divide-y divide-border-subtle ${className}`}
        aria-label={caption}
      >
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            className={renderCompactRow ? "py-3" : "space-y-2.5 py-4"}
          >
            {renderCompactRow ? (
              renderCompactRow(row)
            ) : (
              <>
                {titleColumn && (
                  <div className="min-w-0">{titleColumn.cell(row)}</div>
                )}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {detailColumns.map((col) => (
                    <div key={col.id} className="min-w-0">
                      <dt className="text-micro font-semibold uppercase tracking-wider text-text-muted">
                        {col.header}
                      </dt>
                      <dd className="mt-0.5 text-xs text-stone-800">
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const tableColumns = columns.filter((c) => !c.hideInTable);

  return (
    /* `tabIndex={0}` so the horizontal scroll is operable without a pointer;
       the caption names the region so it is not announced as an unnamed group. */
    <div
      className={`overflow-x-auto ${className}`}
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-stone-50 text-stone-700 font-bold border-b border-border-base">
          <tr>
            {tableColumns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={`p-3.5 whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="hover:bg-bg-base motion-interactive"
            >
              {tableColumns.map((col) => (
                <td
                  key={col.id}
                  className={`p-3.5 align-middle ${col.align === "right" ? "text-right" : ""} ${
                    col.className ?? ""
                  }`}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
