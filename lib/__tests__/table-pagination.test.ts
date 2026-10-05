import { describe, expect, it } from "vitest";
import { getTablePage } from "@/lib/table-pagination";

describe("table pagination", () => {
  it("bounds a 5,000-row dataset and includes the final partial page", () => {
    const rows = Array.from({ length: 5003 }, (_, index) => index);
    const first = getTablePage({ total: rows.length, page: 1 });
    const last = getTablePage({ total: rows.length, page: 101 });

    expect(rows.slice(first.startIndex, first.endIndex)).toHaveLength(50);
    expect(last.pageCount).toBe(101);
    expect(rows.slice(last.startIndex, last.endIndex)).toEqual([5000, 5001, 5002]);
  });

  it("clamps a removed page to remaining results instead of an empty slice", () => {
    const refreshedRows = Array.from({ length: 53 }, (_, index) => index);
    const pagination = getTablePage({ total: refreshedRows.length, page: 100 });

    expect(pagination.page).toBe(2);
    expect(refreshedRows.slice(pagination.startIndex, pagination.endIndex)).toEqual([
      50, 51, 52,
    ]);
  });

  it("returns the first page for empty data without negative bounds", () => {
    expect(getTablePage({ total: 0, page: 100 })).toEqual({
      page: 1,
      pageCount: 1,
      startIndex: 0,
      endIndex: 0,
      total: 0,
    });
  });
});
