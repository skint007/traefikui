import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { count, eq } from "drizzle-orm";
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
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },
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
          after: async (user) => {
            // Run inside a sqlite transaction so the count check and the
            // role/registration writes can't interleave with another concurrent
            // signup.
            db.transaction((tx) => {
              const totals = tx
                .select({ total: count() })
                .from(schema.user)
                .get();
              const total = totals?.total ?? 0;

              // First user becomes admin; subsequent users default to "user".
              if (total === 1) {
                tx.update(schema.user)
                  .set({ role: "admin" })
                  .where(eq(schema.user.id, user.id))
                  .run();
              }

              // Auto-disable registration once any user exists.
              if (total >= 1) {
                tx.insert(schema.appSettings)
                  .values({ key: "registration_enabled", value: "false" })
                  .onConflictDoUpdate({
                    target: schema.appSettings.key,
                    set: { value: "false" },
                  })
                  .run();
              }
            });
            // Touch the async setter so any external listeners stay in sync.
            await setRegistrationEnabled(false).catch(() => undefined);
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
