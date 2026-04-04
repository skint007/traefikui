import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isRegistrationEnabled,
  setRegistrationEnabled,
} from "@/lib/app-settings";
import { requireSession } from "@/lib/require-session";

const RegistrationSchema = z.object({
  enabled: z.boolean(),
});

// Public endpoint - register page checks this
export async function GET() {
  try {
    const enabled = await isRegistrationEnabled();
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json(
      { error: "Failed to get setting" },
      { status: 500 }
    );
  }
}

// Protected - requires authenticated session
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const parsed = RegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing 'enabled' boolean in request body" },
        { status: 400 }
      );
    }

    await setRegistrationEnabled(parsed.data.enabled);
    return NextResponse.json({ enabled: parsed.data.enabled });
  } catch {
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
