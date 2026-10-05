export const TABLE_PAGE_SIZE = 50;

/** Clamp the requested page before slicing, including when refreshed data shrinks. */
export function getTablePage({ total, page }: { total: number; page: number }) {
  const pageCount = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  const startIndex = (currentPage - 1) * TABLE_PAGE_SIZE;

  return {
    page: currentPage,
    pageCount,
    startIndex,
    endIndex: Math.min(startIndex + TABLE_PAGE_SIZE, total),
    total,
  };
}
