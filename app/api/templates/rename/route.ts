import { NextRequest, NextResponse } from "next/server";
import { renameTemplateFile } from "@/lib/config/yaml-helpers";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { oldPath, newPath } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Missing 'oldPath' or 'newPath' in request body" },
        { status: 400 }
      );
    }

    await renameTemplateFile(oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("templates/rename failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to rename template file" },
      { status: 500 }
    );
  }
}
