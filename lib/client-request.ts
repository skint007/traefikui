import { CLIENT_DEADLINE_MS, RequestDeadlineError, withRequestDeadline } from "@/lib/request-deadline";

export class APIRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "APIRequestError";
  }
}

/** The browser deadline includes the API response body, not only headers. */
export function fetchAPI<T>(path: string, init?: RequestInit): Promise<T> {
  return withRequestDeadline(async (signal) => {
    const res = await fetch(path, { ...init, signal });
    if (!res.ok) {
      const body = await res.text();
      let message = body || `API error: ${res.status} ${res.statusText}`;
      try {
        const data: unknown = JSON.parse(body);
        if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
          message = data.error;
        }
      } catch { /* Non-JSON upstream errors can still provide useful text. */ }
      throw new APIRequestError(res.status, message);
    }
    return res.json();
  }, { signal: init?.signal, timeoutMs: CLIENT_DEADLINE_MS });
}

// Timeout/cancellation are terminal for this attempt. Other transient failures
// get one retry; subsequent refreshes follow the user's existing polling setting.
export function retryResourceRequest(failureCount: number, error: Error): boolean {
  if (error instanceof RequestDeadlineError || error.name === "AbortError") return false;
  if (error instanceof APIRequestError && (error.status < 500 || error.status === 504)) return false;
  return failureCount < 1;
}

export const resourceRetryOptions = {
  retry: retryResourceRequest,
  retryDelay: 1_000,
};
