import { NextRequest, NextResponse } from "next/server";
import { deleteTemplateFile } from "@/lib/config/yaml-helpers";
import { requireSession } from "@/lib/require-session";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: "Missing 'filePath' in request body" },
        { status: 400 }
      );
    }

    await deleteTemplateFile(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete template" },
      { status: 500 }
    );
  }
}
