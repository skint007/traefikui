import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAgentMode = process.env.TRAEFIKUI_MODE === "agent";

  // Agent mode: only allow /api/agent/* routes
  if (isAgentMode) {
    if (pathname.startsWith("/api/agent/")) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "This instance is running in agent mode" },
      { status: 404 }
    );
  }

  // Master mode (default)

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow API routes to handle their own auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for session cookie (secure variant used over HTTPS)
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
