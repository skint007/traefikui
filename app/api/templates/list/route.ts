import { NextResponse } from "next/server";
import { listTemplateFiles } from "@/lib/config/yaml-helpers";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const files = await listTemplateFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error("templates/list failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 }
    );
  }
}
