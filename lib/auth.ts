import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { count } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./db/schema";
import {
  isRegistrationEnabled,
  setRegistrationEnabled,
} from "./app-settings";

function createAuth() {
  // In agent mode, auth is not used — return a no-op to avoid
  // warnings about missing BETTER_AUTH_SECRET and database errors.
  if (process.env.TRAEFIKUI_MODE === "agent") {
    return null as unknown as ReturnType<typeof betterAuth>;
  }

  return betterAuth({
    appName: "TraefikUI",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            const enabled = await isRegistrationEnabled();
            if (!enabled) {
              return false;
            }
            return undefined;
          },
          after: async () => {
            const result = await db
              .select({ total: count() })
              .from(schema.user)
              .get();
            if (result && result.total >= 1) {
              await setRegistrationEnabled(false);
            }
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh session token daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 min cache
      },
    },
    plugins: [twoFactor(), nextCookies()],
    trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  });
}

export const auth = createAuth();

export type Session = typeof auth.$Infer.Session;
