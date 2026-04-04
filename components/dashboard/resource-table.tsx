"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileCode } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface ResourceTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
}

export function ResourceTable<T>({
  data,
  columns,
  emptyMessage = "No data available",
}: ResourceTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
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
          {data.map((row, i) => (
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
