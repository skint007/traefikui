import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getLocalInstanceName,
  setLocalInstanceName,
} from "@/lib/app-settings";
import { requireSession } from "@/lib/require-session";

const LocalNameSchema = z.object({
  name: z.string().min(1).max(255).trim(),
});

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const name = await getLocalInstanceName();
    return NextResponse.json({ name });
  } catch {
    return NextResponse.json(
      { error: "Failed to get setting" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const parsed = LocalNameSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Name must be a string between 1 and 255 characters" },
        { status: 400 }
      );
    }

    await setLocalInstanceName(parsed.data.name);
    const saved = await getLocalInstanceName();
    return NextResponse.json({ name: saved });
  } catch {
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
