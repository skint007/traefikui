import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Validates the X-API-Key header against the AGENT_API_KEY env var.
 * Returns a 401 response if invalid, or null if valid.
 */
export function requireAgentAuth(request: NextRequest): NextResponse | null {
  const apiKey = process.env.AGENT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Agent mode not configured (missing AGENT_API_KEY)" },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-api-key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(apiKey);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
