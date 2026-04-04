import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    status: "ok",
    version: "1.0.0",
    mode: "agent",
  });
}
