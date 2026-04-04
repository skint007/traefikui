import { NextRequest, NextResponse } from "next/server";
import { readTemplateFile } from "@/lib/config/yaml-helpers";
import { requireSession } from "@/lib/require-session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const filePath = request.nextUrl.searchParams.get("path");
    if (!filePath) {
      return NextResponse.json(
        { error: "Missing 'path' query parameter" },
        { status: 400 }
      );
    }

    const data = await readTemplateFile(filePath);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read template" },
      { status: 500 }
    );
  }
}
