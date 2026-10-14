"use client";

import type { ReactNode } from "react";
import { EmptyState, ErrorMessage, LoadingMessage } from "../feedback";

export interface Column<T> { key: string; label: string; render: (row: T) => ReactNode }
export interface DataTableProps<T> {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string;
  loading?: boolean; error?: string; onRetry?: () => void;
  page?: number; pageSize?: number; total?: number;
  onPageChange?: (page: number) => void; actions?: (row: T) => ReactNode;
}
export function DataTable<T>({ rows, columns, rowKey, loading, error, onRetry, page = 1, pageSize = 20, total = rows.length, onPageChange, actions }: DataTableProps<T>) {
  if (loading) return <LoadingMessage />;
  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;
  if (!rows.length) return <EmptyState />;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return <div>
    <table><thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}{actions && <th scope="col">Actions</th>}</tr></thead>
      <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}{actions && <td>{actions(row)}</td>}</tr>)}</tbody>
    </table>
    {onPageChange && <nav aria-label="Table pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>}
  </div>;
}
