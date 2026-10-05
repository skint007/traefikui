"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getTablePage } from "@/lib/table-pagination";

/** Filter and sort first. A changed search/filter/server scope starts at page one. */
export function useTablePagination<T>(data: T[], resetKey: string) {
  const [selection, setSelection] = useState({ page: 1, resetKey });
  const pagination = getTablePage({
    total: data.length,
    page: selection.resetKey === resetKey ? selection.page : 1,
  });

  // Persist clamps so an old page does not return when the dataset grows again.
  if (selection.resetKey !== resetKey || selection.page !== pagination.page) {
    setSelection({ page: pagination.page, resetKey });
  }

  return {
    ...pagination,
    rows: data.slice(pagination.startIndex, pagination.endIndex),
    onPageChange: (page: number) => setSelection({ page, resetKey }),
  };
}

type TablePaginationProps = ReturnType<typeof getTablePage> & {
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  pageCount,
  startIndex,
  endIndex,
  total,
  onPageChange,
}: TablePaginationProps) {
  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total} results
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
