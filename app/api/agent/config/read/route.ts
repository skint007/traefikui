import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { readConfigFile } from "@/lib/config/yaml-helpers";

export async function GET(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const filePath = request.nextUrl.searchParams.get("path");
    if (!filePath) {
      return NextResponse.json(
        { error: "Missing 'path' query parameter" },
        { status: 400 }
      );
    }

    const data = await readConfigFile(filePath);
    return NextResponse.json(data);
  } catch (error) {
    console.error("agent route failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to read config file" },
      { status: 500 }
    );
  }
}
