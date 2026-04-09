"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileCode, Search, X } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface ResourceTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  searchField?: (row: T) => string;
}

export function ResourceTable<T>({
  data,
  columns,
  emptyMessage = "No data available",
  searchField,
}: ResourceTableProps<T>) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const filtered = searchField && search.trim()
    ? data.filter((row) => searchField(row).toLowerCase().includes(search.toLowerCase()))
    : data;

  return (
    <div className="space-y-4">
      {searchField && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {search ? "No matching results" : emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.className ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                  {columns.map((col, j) => (
                    <td key={j} className={`px-4 py-3 ${col.className ?? ""}`}>
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const variant =
    status === "enabled"
      ? "success"
      : status === "warning"
        ? "warning"
        : status === "disabled"
          ? "secondary"
          : "destructive";

  return <Badge variant={variant}>{status ?? "unknown"}</Badge>;
}

export function ProviderBadge({
  provider,
  configFile,
}: {
  provider?: string;
  configFile?: string;
}) {
  if (provider === "file" && configFile) {
    return (
      <Link
        href={`/config?file=${encodeURIComponent(configFile)}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <FileCode className="h-3 w-3" />
        {configFile}
      </Link>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      {provider ?? "unknown"}
    </Badge>
  );
}

/**
 * Sort traefik resources by provider (file first), then alphabetically by name.
 */
export function sortByProviderThenName<
  T extends { provider?: string; name?: string },
>(data: T[]): T[] {
  return [...data].sort((a, b) => {
    const provA = a.provider ?? "";
    const provB = b.provider ?? "";
    if (provA !== provB) {
      // file provider first, then alphabetical
      if (provA === "file") return -1;
      if (provB === "file") return 1;
      return provA.localeCompare(provB);
    }
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}
