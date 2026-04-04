"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { useSSE } from "@/hooks/use-sse";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useSSE();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="container mx-auto p-6 pt-20 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
