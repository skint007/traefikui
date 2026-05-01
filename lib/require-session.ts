import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Validates the session from the request headers.
 * Returns the session if valid, or a 401 NextResponse if not.
 */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/**
 * Validates the session and asserts the user is an admin.
 * Returns the session if admin, otherwise a 401/403 NextResponse.
 *
 * Use for endpoints that expose cross-tenant data or change global settings.
 */
export async function requireAdmin() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}
