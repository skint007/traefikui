import { configWatcher } from "@/lib/watcher";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_CONNECTIONS_PER_USER = 4;
const connectionsByUser = new Map<string, number>();

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const current = connectionsByUser.get(userId) ?? 0;
  if (current >= MAX_CONNECTIONS_PER_USER) {
    return new Response("Too many open SSE connections", { status: 429 });
  }
  connectionsByUser.set(userId, current + 1);

  const release = () => {
    const next = (connectionsByUser.get(userId) ?? 1) - 1;
    if (next <= 0) connectionsByUser.delete(userId);
    else connectionsByUser.set(userId, next);
  };

  const encoder = new TextEncoder();
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  let released = false;
  const cleanup = () => {
    if (released) return;
    released = true;
    if (keepalive) clearInterval(keepalive);
    if (unsubscribe) unsubscribe();
    release();
  };

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`)
      );

      unsubscribe = configWatcher.subscribe((event) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: config-changed\ndata: ${JSON.stringify(event)}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      });

      keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, 30000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
