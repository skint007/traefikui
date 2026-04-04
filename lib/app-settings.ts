import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .get();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value },
    });
}

export async function isRegistrationEnabled(): Promise<boolean> {
  const value = await getSetting("registration_enabled");
  // Default to true if setting doesn't exist (fresh install)
  return value !== "false";
}

export async function setRegistrationEnabled(enabled: boolean): Promise<void> {
  await setSetting("registration_enabled", enabled ? "true" : "false");
}

const DEFAULT_LOCAL_NAME = "Local Instance";

export async function getLocalInstanceName(): Promise<string> {
  const value = await getSetting("local_instance_name");
  return value || DEFAULT_LOCAL_NAME;
}

export async function setLocalInstanceName(name: string): Promise<void> {
  await setSetting("local_instance_name", name.trim() || DEFAULT_LOCAL_NAME);
}
