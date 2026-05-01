import { NextRequest, NextResponse } from "next/server";
import { writeTemplateFile } from "@/lib/config/yaml-helpers";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { filePath, content } = body;

    if (!filePath || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing 'filePath' or 'content' in request body" },
        { status: 400 }
      );
    }

    await writeTemplateFile(filePath, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("templates/write failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to write template" },
      { status: 500 }
    );
  }
}
