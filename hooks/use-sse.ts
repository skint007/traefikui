"use client";

import { useEffect, useRef } from "react";
import { focusManager, useQueryClient } from "@tanstack/react-query";
import { invalidateServerConfig } from "@/hooks/config-invalidation";

export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    function connect() {
      if (eventSourceRef.current) return;
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
    }

    function disconnect() {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    }

    if (focusManager.isFocused()) connect();
    const unsubscribe = focusManager.subscribe((focused) => {
      if (!focused) {
        disconnect();
        return;
      }
      connect();
      // Reconcile files missed while hidden. Resources retain their polling and
      // focus policy, including the slower retry cadence for failed servers.
      void queryClient.invalidateQueries({
        queryKey: ["config"],
        predicate: ({ queryKey }) => queryKey[queryKey.length - 1] === null,
      });
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [queryClient]);
}
