import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { server } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, requireAdmin } from "@/lib/require-session";
import { validateServerUrl } from "@/lib/validate-url";

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "••••••••";
  return apiKey.slice(0, 4) + "••••" + apiKey.slice(-4);
}

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const servers = await db.select().from(server).all();

    const safe = servers.map(({ apiKey, ...rest }) => ({
      ...rest,
      apiKeyMasked: maskApiKey(apiKey),
    }));

    return NextResponse.json(safe);
  } catch (error) {
    console.error("Failed to list servers:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Failed to list servers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
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

    const id = crypto.randomUUID();

    if (isDefault) {
      await db
        .update(server)
        .set({ isDefault: false })
        .where(eq(server.isDefault, true));
    }

    const newServer = {
      id,
      name,
      url: url.replace(/\/+$/, ""),
      apiKey,
      isDefault: isDefault ?? false,
      status: "unknown" as const,
    };

    await db.insert(server).values(newServer);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey: _omit, ...safe } = newServer;
    return NextResponse.json({ ...safe, apiKeyMasked: maskApiKey(apiKey) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create server:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json(
      { error: "Failed to create server" },
      { status: 500 }
    );
  }
}
