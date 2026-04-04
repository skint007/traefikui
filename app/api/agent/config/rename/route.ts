import { NextRequest, NextResponse } from "next/server";
import { requireAgentAuth } from "@/lib/agent-middleware";
import { renameConfigFile } from "@/lib/config/yaml-helpers";

export async function POST(request: NextRequest) {
  const authError = requireAgentAuth(request);
  if (authError) return authError;

  try {
    const { oldPath, newPath } = await request.json();
    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Missing 'oldPath' or 'newPath' in request body" },
        { status: 400 }
      );
    }

    await renameConfigFile(oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rename config file" },
      { status: 500 }
    );
  }
}
