"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminApiError, AdminAuthError } from "@/lib/adminApi";
import { ResourceTable, type Column } from "./ResourceTable";

export interface ResourceFormProps<TRow, TInput> {
  initial: TRow | null;
  busy: boolean;
  error: string | null;
  onSubmit: (input: TInput) => void;
  onCancel: () => void;
}

export interface ResourceManagerProps<TRow extends { id: number }, TInput> {
  /** Accessible name for the table (also used as the list heading). */
  title: string;
  addTitle: string;
  editTitle: string;
  columns: Column<TRow>[];
  load: () => Promise<TRow[]>;
  create: (input: TInput) => Promise<unknown>;
  update: (id: number, input: TInput) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  renderForm: (props: ResourceFormProps<TRow, TInput>) => React.ReactNode;
  /** Called on 401 so the shell can bounce to the login page. */
  onAuthError: () => void;
}

type Mode<TRow> =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; row: TRow };

/**
 * Generic list + bilingual-form orchestration for one admin resource:
 * fetch → table → add/edit form → save → refresh ("optimistic refresh").
 */
export function ResourceManager<TRow extends { id: number }, TInput>({
  title,
  addTitle,
  editTitle,
  columns,
  load,
  create,
  update,
  remove,
  renderForm,
  onAuthError,
}: ResourceManagerProps<TRow, TInput>) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState<TRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [mode, setMode] = useState<Mode<TRow>>({ kind: "list" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setRows(await load());
    } catch (error: unknown) {
      if (error instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [load, onAuthError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSubmit = async (input: TInput) => {
    setBusy(true);
    setFormError(null);
    try {
      if (mode.kind === "edit") {
        await update(mode.row.id, input);
      } else {
        await create(input);
      }
      setMode({ kind: "list" });
      await refresh();
    } catch (error: unknown) {
      if (error instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      const conflict = error instanceof AdminApiError && error.status === 409;
      setFormError(conflict ? t("form.conflict") : t("form.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: TRow) => {
    setActionError(false);
    try {
      await remove(row.id);
      await refresh();
    } catch (error: unknown) {
      if (error instanceof AdminAuthError) {
        onAuthError();
        return;
      }
      setActionError(true);
    }
  };

  if (mode.kind !== "list") {
    return (
      <section aria-label={mode.kind === "edit" ? editTitle : addTitle}>
        <h3 className="mb-6 text-xl font-bold">
          {mode.kind === "edit" ? editTitle : addTitle}
        </h3>
        {renderForm({
          initial: mode.kind === "edit" ? mode.row : null,
          busy,
          error: formError,
          onSubmit: (input) => void handleSubmit(input),
          onCancel: () => {
            setFormError(null);
            setMode({ kind: "list" });
          },
        })}
      </section>
    );
  }

  return (
    <section aria-label={title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm opacity-60">
          {loading ? t("list.loading") : t("list.countLabel", { count: rows.length })}
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setMode({ kind: "create" });
          }}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-night transition-colors duration-200 ease-heritage hover:bg-gold-bright"
        >
          {t("list.add")}
        </button>
      </div>

      {actionError ? (
        <p role="alert" className="mb-4 rounded-xs border border-clay/40 bg-clay/10 px-4 py-2 text-sm text-clay">
          {t("list.actionError")}
        </p>
      ) : null}

      {loadError ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-(--line-soft) px-6 py-10">
          <p role="alert" className="text-sm text-clay">
            {t("list.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md border border-(--line-soft) px-4 py-2 text-sm transition-colors duration-200 ease-heritage hover:border-gold hover:text-gold-bright"
          >
            {t("list.retry")}
          </button>
        </div>
      ) : loading ? (
        <p className="rounded-md border border-(--line-soft) px-6 py-10 text-center text-sm opacity-60">
          {t("list.loading")}
        </p>
      ) : (
        <ResourceTable
          columns={columns}
          rows={rows}
          onEdit={(row) => {
            setFormError(null);
            setMode({ kind: "edit", row });
          }}
          onDelete={(row) => void handleDelete(row)}
          label={title}
        />
      )}
    </section>
  );
}
