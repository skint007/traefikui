import { QueryClient, QueriesObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasGlobalQueryError,
  isGlobalResourcesLoading,
} from "@/hooks/use-all-servers";

describe("isGlobalResourcesLoading", () => {
  const queryClients: QueryClient[] = [];

  afterEach(() => {
    for (const queryClient of queryClients) {
      queryClient.clear();
    }
  });

  it("keeps healthy results visible while another instance fails and retries", async () => {
    const healthyRequest = Promise.withResolvers<string[]>();
    const failedRequest = Promise.withResolvers<string[]>();
    const retryRequest = Promise.withResolvers<string[]>();
    let failedAttempts = 0;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClients.push(queryClient);

    const observer = new QueriesObserver(queryClient, [
      {
        queryKey: ["healthy-instance"],
        queryFn: () => healthyRequest.promise,
      },
      {
        queryKey: ["failed-instance"],
        queryFn: () => {
          failedAttempts += 1;
          return failedAttempts === 1
            ? failedRequest.promise
            : retryRequest.promise;
        },
      },
    ]);
    const unsubscribe = observer.subscribe(() => undefined);

    try {
      await vi.waitFor(() => {
        expect(observer.getCurrentResult().every((query) => query.isLoading)).toBe(
          true
        );
      });
      expect(isGlobalResourcesLoading(observer.getCurrentResult())).toBe(true);

      healthyRequest.resolve(["router-a"]);
      await vi.waitFor(() => {
        expect(observer.getCurrentResult()[0]?.data).toEqual(["router-a"]);
      });

      expect(observer.getCurrentResult()[1]?.isLoading).toBe(true);
      expect(isGlobalResourcesLoading(observer.getCurrentResult())).toBe(false);

      failedRequest.reject(new Error("instance unavailable"));
      await vi.waitFor(() => {
        expect(observer.getCurrentResult().every((query) => query.isFetched)).toBe(
          true
        );
      });
      expect(hasGlobalQueryError(observer.getCurrentResult()[1])).toBe(true);

      void queryClient.refetchQueries({ queryKey: ["failed-instance"] });
      await vi.waitFor(() => {
        const failedQuery = observer.getCurrentResult()[1];
        expect(failedQuery?.isFetched).toBe(true);
        expect(failedQuery?.isLoading).toBe(true);
      });

      expect(observer.getCurrentResult()[0]?.data).toEqual(["router-a"]);
      expect(isGlobalResourcesLoading(observer.getCurrentResult())).toBe(false);
      expect(hasGlobalQueryError(observer.getCurrentResult()[1])).toBe(true);

      retryRequest.resolve([]);
      await vi.waitFor(() => {
        expect(observer.getCurrentResult()[1]?.isSuccess).toBe(true);
      });
      expect(hasGlobalQueryError(observer.getCurrentResult()[1])).toBe(false);
    } finally {
      unsubscribe();
    }
  });
});
