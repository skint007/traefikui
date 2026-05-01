import { promises as dns } from "dns";
import * as net from "net";

export type ValidateResult = { valid: boolean; error?: string };

/**
 * Strict mode also blocks RFC1918 / IPv6 ULA / CGNAT — the ranges normally
 * used by Docker bridge networks and LANs. Default is off so that the typical
 * deployment (master + agent on the same Docker network, reaching each other
 * by service name) works out of the box.
 *
 * Loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16 incl. cloud
 * metadata, fe80::/10), unspecified (0.0.0.0/8), and multicast are blocked
 * unconditionally — those are the high-impact SSRF targets a malicious agent
 * URL would aim at.
 */
function strictMode(): boolean {
  const v = process.env.TRAEFIKUI_STRICT_SSRF;
  return v === "1" || v === "true";
}

function isBlockedIPv4(addr: string): { blocked: boolean; reason?: string } {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return { blocked: true, reason: "Invalid IPv4 address" };
  }
  const [a, b] = parts;

  // Always blocked — high-impact SSRF targets.
  if (a === 127) return { blocked: true, reason: "Loopback address" };
  if (a === 169 && b === 254) return { blocked: true, reason: "Link-local address (incl. cloud metadata)" };
  if (a === 0) return { blocked: true, reason: "Invalid address range" };
  if (a >= 224) return { blocked: true, reason: "Multicast/reserved address" };

  // Blocked only in strict mode — needed for Docker/LAN deployments by default.
  if (strictMode()) {
    if (a === 10) return { blocked: true, reason: "Private network address" };
    if (a === 172 && b >= 16 && b <= 31) return { blocked: true, reason: "Private network address" };
    if (a === 192 && b === 168) return { blocked: true, reason: "Private network address" };
    if (a === 100 && b >= 64 && b <= 127) return { blocked: true, reason: "CGNAT address" };
  }

  return { blocked: false };
}

function isBlockedIPv6(addr: string): { blocked: boolean; reason?: string } {
  const lower = addr.toLowerCase();

  // Always blocked.
  if (lower === "::" || lower === "::1") {
    return { blocked: true, reason: "Loopback/unspecified IPv6 address" };
  }
  if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") ||
      lower.startsWith("fea") || lower.startsWith("feb")) {
    return { blocked: true, reason: "Link-local IPv6 address" };
  }

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — extract the embedded IPv4 and apply
  // the IPv4 policy (which itself respects strict mode).
  const mappedDotted = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedDotted) {
    const v4 = isBlockedIPv4(mappedDotted[1]);
    if (v4.blocked) return v4;
  }
  // Node's URL parser normalizes ::ffff:127.0.0.1 → ::ffff:7f00:1.
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    const dotted = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
    const v4 = isBlockedIPv4(dotted);
    if (v4.blocked) return v4;
  }

  // Blocked only in strict mode.
  if (strictMode()) {
    if (lower.startsWith("fc") || lower.startsWith("fd")) {
      return { blocked: true, reason: "Unique local IPv6 address" };
    }
  }

  return { blocked: false };
}

function isBlockedHostname(hostname: string): { blocked: boolean; reason?: string } {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h.endsWith(".localhost")) {
    return { blocked: true, reason: "Localhost is not allowed" };
  }
  // Cloud metadata service hostnames — always blocked, even outside strict mode.
  const metadataHosts = new Set([
    "metadata.google.internal",
    "metadata",
    "metadata.azure.com",
    "metadata.aws",
  ]);
  if (metadataHosts.has(h)) {
    return { blocked: true, reason: "Cloud metadata hostname is not allowed" };
  }
  return { blocked: false };
}

/**
 * Performs a syntactic URL check. Does not resolve DNS — call validateResolvedHost
 * at fetch time to defeat DNS rebinding.
 */
export function validateServerUrl(urlString: string): ValidateResult {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only http and https URLs are allowed" };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  const hostBlock = isBlockedHostname(hostname);
  if (hostBlock.blocked) {
    return { valid: false, error: hostBlock.reason };
  }

  if (net.isIPv4(hostname)) {
    const v = isBlockedIPv4(hostname);
    if (v.blocked) return { valid: false, error: v.reason };
  } else if (net.isIPv6(hostname)) {
    const v = isBlockedIPv6(hostname);
    if (v.blocked) return { valid: false, error: v.reason };
  }

  return { valid: true };
}

/**
 * Resolves the hostname and validates every returned address against the
 * block list. Call this immediately before dispatching an outbound request
 * to defeat TOCTOU/DNS-rebinding bypasses of validateServerUrl.
 *
 * Note: a small TOCTOU window remains between this resolution and the actual
 * fetch. To close it fully, switch to an undici Agent with a pinned-IP lookup
 * — left for follow-up work.
 */
export async function validateResolvedHost(
  hostname: string,
): Promise<{ valid: true; addresses: string[] } | { valid: false; error: string }> {
  const stripped = hostname.replace(/^\[|\]$/g, "");
  if (net.isIPv4(stripped)) {
    const v = isBlockedIPv4(stripped);
    if (v.blocked) return { valid: false, error: v.reason ?? "Blocked address" };
    return { valid: true, addresses: [stripped] };
  }
  if (net.isIPv6(stripped)) {
    const v = isBlockedIPv6(stripped);
    if (v.blocked) return { valid: false, error: v.reason ?? "Blocked address" };
    return { valid: true, addresses: [stripped] };
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(stripped, { all: true, verbatim: true });
  } catch (e) {
    return { valid: false, error: `DNS resolution failed: ${e instanceof Error ? e.message : "unknown"}` };
  }

  if (records.length === 0) {
    return { valid: false, error: "No DNS records found" };
  }

  const addresses: string[] = [];
  for (const r of records) {
    const check = r.family === 4 ? isBlockedIPv4(r.address) : isBlockedIPv6(r.address);
    if (check.blocked) {
      return { valid: false, error: `Resolved address is blocked: ${check.reason}` };
    }
    addresses.push(r.address);
  }

  return { valid: true, addresses };
}
