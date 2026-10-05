import { NextRequest, NextResponse } from "next/server";
import { requestErrorMessage, requestErrorStatus } from "@/lib/request-deadline";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { getOverview } from "@/lib/traefik/client";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const data = await getOverview(request.signal);
    return NextResponse.json(data);
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: requestErrorMessage(error, "Failed to fetch overview") },
      { status: requestErrorStatus(error, 502) }
    );
  }
}
