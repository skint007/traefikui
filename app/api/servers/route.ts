import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { requireSession } from "@/lib/require-session";
import { validateServerUrl } from "@/lib/validate-url";

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return apiKey.slice(0, 4) + "••••" + apiKey.slice(-4);
}

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const userId = session.user.id;
    const servers = await db
      .select()
      .from(server)
      .where(or(eq(server.userId, userId), isNull(server.userId)))
      .all();

    const safe = servers.map(({ apiKey, ...rest }) => ({
      ...rest,
      apiKeyMasked: maskApiKey(apiKey),
    }));

    return NextResponse.json(safe);
  } catch (error) {
    console.error("Failed to list servers:", error);
    return NextResponse.json(
      { error: "Failed to list servers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { name, url, apiKey, isDefault } = body;

    if (!name || !url || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields: name, url, apiKey" },
        { status: 400 }
      );
    }

    const urlCheck = validateServerUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json(
        { error: urlCheck.error },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const id = crypto.randomUUID();

    // If this is set as default, clear other defaults for this user
    if (isDefault) {
      await db
        .update(server)
        .set({ isDefault: false })
        .where(
          and(eq(server.isDefault, true), or(eq(server.userId, userId), isNull(server.userId)))
        );
    }

    const newServer = {
      id,
      name,
      url: url.replace(/\/+$/, ""), // strip trailing slashes
      apiKey,
      isDefault: isDefault ?? false,
      status: "unknown" as const,
      userId,
    };

    await db.insert(server).values(newServer);

    // Return without the real API key
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey: _omit, ...safe } = newServer;
    return NextResponse.json({ ...safe, apiKeyMasked: maskApiKey(apiKey) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create server:", error);
    return NextResponse.json(
      { error: "Failed to create server" },
      { status: 500 }
    );
  }
}
