import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  serverExternalPackages: ["better-sqlite3", "chokidar"],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          // 'unsafe-inline' on style-src is required by shadcn/Radix UI primitives
          // which inject runtime style attributes. 'unsafe-eval' has been removed
          // from script-src — CodeMirror does not require eval. 'unsafe-inline' on
          // script-src is retained because Next.js 15 still emits inline bootstrap
          // scripts; revisit once nonce-based CSP support is stable.
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';",
        },
      ],
    },
  ],
};

export default nextConfig;
