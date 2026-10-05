import { afterEach, describe, expect, it, vi } from "vitest";
import { withRequestDeadline, RequestDeadlineError } from "@/lib/request-deadline";

afterEach(() => vi.useRealTimers());

describe("complete-operation deadline", () => {
  it("stops waiting for an uncancellable phase and aborts its operation signal", async () => {
    vi.useFakeTimers();
    let operationSignal: AbortSignal | undefined;
    const result = withRequestDeadline((signal) => {
      operationSignal = signal;
      return new Promise<never>(() => undefined);
    }, { timeoutMs: 100 });
    const rejected = expect(result).rejects.toBeInstanceOf(RequestDeadlineError);
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(operationSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["success", "failure", "abort"])("cleans timers and incoming listeners on %s", async (outcome) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const result = withRequestDeadline(async () => {
      if (outcome === "failure") throw new Error("upstream failed");
      if (outcome === "abort") return new Promise<never>(() => undefined);
      return "healthy";
    }, { signal: controller.signal });
    if (outcome === "success") await expect(result).resolves.toBe("healthy");
    else {
      const rejected = expect(result).rejects.toBeInstanceOf(Error);
      if (outcome === "abort") controller.abort();
      await rejected;
    }
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0]?.[1]);
  });

  it("does not start an operation for an already cancelled request", async () => {
    const operation = vi.fn(async () => "unexpected");
    await expect(withRequestDeadline(operation, { signal: AbortSignal.abort() })).rejects.toMatchObject({ name: "AbortError" });
    expect(operation).not.toHaveBeenCalled();
  });
});
