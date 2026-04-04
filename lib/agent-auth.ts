import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

export function validateAgentApiKey(request: NextRequest): boolean {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) return false;

  const provided = request.headers.get("x-api-key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(apiKey);

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isAgentMode(): boolean {
  return process.env.TRAEFIKUI_MODE === "agent";
}
