import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { getMiddlewares } from "@/lib/traefik/client";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const data = await getMiddlewares();
    return NextResponse.json(data);
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to fetch middlewares" },
      { status: 502 }
    );
  }
}
