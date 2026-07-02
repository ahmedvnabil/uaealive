"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface Column<TRow> {
  key: string;
  header: string;
  render: (row: TRow) => React.ReactNode;
}

export interface ResourceTableProps<TRow extends { id: number }> {
  columns: Column<TRow>[];
  rows: TRow[];
  onEdit: (row: TRow) => void;
  onDelete: (row: TRow) => void;
  /** Accessible name for the table. */
  label: string;
}

const CONFIRM_RESET_MS = 4000;

/**
 * Generic admin table: columns + rows + edit/delete actions.
 * Delete is two-step inline (click → confirm) instead of a modal.
 */
export function ResourceTable<TRow extends { id: number }>({
  columns,
  rows,
  onEdit,
  onDelete,
  label,
}: ResourceTableProps<TRow>) {
  const t = useTranslations("admin.list");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (confirmId === null) return;
    const timer = setTimeout(() => setConfirmId(null), CONFIRM_RESET_MS);
    return () => clearTimeout(timer);
  }, [confirmId]);

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-(--line-soft) px-6 py-10 text-center text-sm opacity-60">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-(--line-soft)">
      <table className="w-full min-w-[640px] text-sm" aria-label={label}>
        <thead>
          <tr className="border-b border-(--line-soft) bg-mist">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider opacity-70"
              >
                {column.header}
              </th>
            ))}
            <th
              scope="col"
              className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider opacity-70"
            >
              {t("actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-(--line-soft) transition-colors duration-200 ease-heritage last:border-b-0 hover:bg-mist"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-top">
                  {column.render(row)}
                </td>
              ))}
              <td className="px-4 py-3 text-end align-top">
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="rounded-xs px-2 py-1 text-xs font-medium text-gold-bright transition-colors duration-200 ease-heritage hover:bg-mist"
                  >
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmId === row.id) {
                        setConfirmId(null);
                        onDelete(row);
                      } else {
                        setConfirmId(row.id);
                      }
                    }}
                    className={cn(
                      "rounded-xs px-2 py-1 text-xs font-medium transition-colors duration-200 ease-heritage",
                      confirmId === row.id
                        ? "bg-clay text-sand"
                        : "text-clay hover:bg-mist",
                    )}
                  >
                    {confirmId === row.id ? t("confirmDelete") : t("delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
