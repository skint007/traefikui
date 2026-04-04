"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/watch");
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("config-changed", (event) => {
      try {
        const data = JSON.parse(event.data);
        // Invalidate config queries
        queryClient.invalidateQueries({ queryKey: ["config"] });
        // Also invalidate traefik state since config changed
        queryClient.invalidateQueries({ queryKey: ["traefik"] });

        console.log("[SSE] Config changed:", data);
      } catch {
        console.error("[SSE] Failed to parse event data");
      }
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
