/**
 * Validates a server URL to prevent SSRF attacks.
 * Blocks internal/private network ranges and non-HTTP schemes.
 */
export function validateServerUrl(urlString: string): {
  valid: boolean;
  error?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Only allow http/https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only http and https URLs are allowed" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0"
  ) {
    return { valid: false, error: "Localhost URLs are not allowed" };
  }

  // Block IPv6 loopback and private ranges
  if (
    hostname === "[::1]" ||
    hostname.startsWith("[fe80:") ||
    hostname.startsWith("[fc") ||
    hostname.startsWith("[fd")
  ) {
    return { valid: false, error: "Private/loopback IPv6 addresses are not allowed" };
  }

  // Check IPv4 ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);

    // 127.0.0.0/8 — full loopback range
    if (a === 127) {
      return { valid: false, error: "Loopback addresses are not allowed" };
    }

    // 10.0.0.0/8 — Class A private
    if (a === 10) {
      return { valid: false, error: "Private network addresses are not allowed" };
    }

    // 172.16.0.0/12 — Class B private
    if (a === 172 && b >= 16 && b <= 31) {
      return { valid: false, error: "Private network addresses are not allowed" };
    }

    // 192.168.0.0/16 — Class C private
    if (a === 192 && b === 168) {
      return { valid: false, error: "Private network addresses are not allowed" };
    }

    // 169.254.0.0/16 — link-local (includes cloud metadata 169.254.169.254)
    if (a === 169 && b === 254) {
      return { valid: false, error: "Link-local addresses are not allowed" };
    }

    // 0.0.0.0/8
    if (a === 0) {
      return { valid: false, error: "Invalid address range" };
    }
  }

  // Block cloud metadata hostnames
  if (hostname === "metadata.google.internal") {
    return { valid: false, error: "Cloud metadata URLs are not allowed" };
  }

  return { valid: true };
}
