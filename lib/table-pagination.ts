export const TABLE_PAGE_SIZE = 50;

/** Keep a resource opened from a View link visible before paginating its matches. */
export function filterTableRows<T>({
  data,
  search,
  searchField,
  prioritizeExactMatch,
}: {
  data: T[];
  search: string;
  searchField: (row: T) => string;
  prioritizeExactMatch: boolean;
}) {
  if (!search.trim()) return data;
  const query = search.toLowerCase();
  const matches = data.filter((row) => searchField(row).toLowerCase().includes(query));
  if (!prioritizeExactMatch) return matches;
  const exactIndex = matches.findIndex((row) => searchField(row) === search);
  if (exactIndex <= 0) return matches;
  const [exact] = matches.splice(exactIndex, 1);
  matches.unshift(exact);
  return matches;
}

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
