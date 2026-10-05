"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateServerConfig } from "@/hooks/config-invalidation";

export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/watch");
    eventSourceRef.current = eventSource;

    // This stream watches the dashboard's local config directory only.
    eventSource.addEventListener("config-changed", () => {
      void invalidateServerConfig(queryClient, null);
    });

    eventSource.addEventListener("connected", () => {
      console.log("[SSE] Connected to config watcher");
    });

    eventSource.onerror = () => {
      console.error("[SSE] Connection error, will retry...");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);
}
