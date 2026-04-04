import { NextRequest, NextResponse } from "next/server";
import { getServices } from "@/lib/traefik/client";
import { proxyToAgent } from "@/lib/server-proxy";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const serverId = request.nextUrl.searchParams.get("serverId");

  try {
    if (serverId) {
      const data = await proxyToAgent(serverId, "/traefik/services");
      return NextResponse.json(data);
    }

    const services = await getServices();
    return NextResponse.json(services);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 502 }
    );
  }
}
