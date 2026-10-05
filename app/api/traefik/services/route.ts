import { NextRequest, NextResponse } from "next/server";
import { requestErrorMessage, requestErrorStatus } from "@/lib/request-deadline";
import { getServices } from "@/lib/traefik/client";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const serverId = request.nextUrl.searchParams.get("serverId");

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, "/traefik/services", { signal: request.signal });
      return NextResponse.json(data);
    }

    const services = await getServices(request.signal);
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json(
      { error: requestErrorMessage(error, "Failed to fetch services") },
      { status: requestErrorStatus(error, 502) }
    );
  }
}
