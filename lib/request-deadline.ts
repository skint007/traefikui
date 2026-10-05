export const OUTBOUND_DEADLINE_MS = 10_000;
export const HEALTH_DEADLINE_MS = 5_000;
export const CLIENT_DEADLINE_MS = 15_000;

export class RequestDeadlineError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs / 1000} seconds`);
    this.name = "RequestDeadlineError";
  }
}

/** Bounds the entire operation, including work that does not support aborting. */
export async function withRequestDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  { signal: incoming, timeoutMs = OUTBOUND_DEADLINE_MS }: {
    signal?: AbortSignal | null;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  incoming?.throwIfAborted();
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(incoming?.reason);
  incoming?.addEventListener("abort", forwardAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new RequestDeadlineError(timeoutMs)), timeoutMs);
  let rejectOnAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
  });
  try {
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    incoming?.removeEventListener("abort", forwardAbort);
    controller.signal.removeEventListener("abort", rejectOnAbort);
  }
}

export function requestErrorStatus(error: unknown, fallback: number): number {
  if (error instanceof RequestDeadlineError) return 504;
  if (error instanceof Error && error.name === "AbortError") return 499;
  return fallback;
}

export function requestErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof RequestDeadlineError) return error.message;
  if (error instanceof Error && error.name === "AbortError") return "Request cancelled";
  return fallback;
}
