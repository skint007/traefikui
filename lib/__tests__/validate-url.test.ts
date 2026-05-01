import { describe, it, expect, beforeEach, afterEach } from "vitest";

async function importValidator() {
  // The strict-mode flag is read at call time, but re-importing keeps tests
  // resilient to any future module-level memoization.
  return await import("../validate-url");
}

describe("validateServerUrl", () => {
  let originalStrict: string | undefined;

  beforeEach(() => {
    originalStrict = process.env.TRAEFIKUI_STRICT_SSRF;
    delete process.env.TRAEFIKUI_STRICT_SSRF;
  });
  afterEach(() => {
    if (originalStrict !== undefined) process.env.TRAEFIKUI_STRICT_SSRF = originalStrict;
    else delete process.env.TRAEFIKUI_STRICT_SSRF;
  });

  describe("default (non-strict) mode", () => {
    it("accepts public http URLs", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://example.com").valid).toBe(true);
      expect(validateServerUrl("https://example.com:8080/path").valid).toBe(true);
    });

    it("accepts RFC1918 private addresses (Docker/LAN deployments)", async () => {
      const { validateServerUrl } = await importValidator();
      for (const host of [
        "http://10.0.0.5",
        "http://172.18.0.2",
        "http://172.31.255.1",
        "http://192.168.1.10",
        "http://100.64.0.1",
      ]) {
        expect(validateServerUrl(host).valid, host).toBe(true);
      }
    });

    it("accepts IPv6 ULA addresses", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://[fc00::1]").valid).toBe(true);
      expect(validateServerUrl("http://[fd00::1]").valid).toBe(true);
    });

    it("rejects non-http protocols", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("file:///etc/passwd").valid).toBe(false);
      expect(validateServerUrl("ftp://example.com").valid).toBe(false);
      expect(validateServerUrl("javascript:alert(1)").valid).toBe(false);
    });

    it("rejects loopback even without strict mode", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://localhost").valid).toBe(false);
      expect(validateServerUrl("http://127.0.0.1").valid).toBe(false);
      expect(validateServerUrl("http://127.5.5.5").valid).toBe(false);
      expect(validateServerUrl("http://0.0.0.0").valid).toBe(false);
      expect(validateServerUrl("http://foo.localhost").valid).toBe(false);
    });

    it("rejects link-local incl. cloud metadata even without strict mode", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://169.254.169.254").valid).toBe(false);
      expect(validateServerUrl("http://169.254.0.1").valid).toBe(false);
    });

    it("rejects multicast and 0/8 ranges even without strict mode", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://224.0.0.1").valid).toBe(false);
      expect(validateServerUrl("http://0.0.0.5").valid).toBe(false);
    });

    it("rejects IPv6 loopback and link-local even without strict mode", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://[::1]").valid).toBe(false);
      expect(validateServerUrl("http://[fe80::1]").valid).toBe(false);
    });

    it("rejects IPv4-mapped IPv6 of always-blocked addresses", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://[::ffff:127.0.0.1]").valid).toBe(false);
      expect(validateServerUrl("http://[::ffff:169.254.169.254]").valid).toBe(false);
    });

    it("rejects cloud metadata hostnames even without strict mode", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://metadata.google.internal").valid).toBe(false);
      expect(validateServerUrl("http://metadata").valid).toBe(false);
    });
  });

  describe("strict mode (TRAEFIKUI_STRICT_SSRF=1)", () => {
    beforeEach(() => {
      process.env.TRAEFIKUI_STRICT_SSRF = "1";
    });

    it("rejects all RFC1918 private and CGNAT ranges", async () => {
      const { validateServerUrl } = await importValidator();
      for (const host of [
        "http://10.0.0.1",
        "http://172.16.0.1",
        "http://172.31.0.1",
        "http://192.168.1.1",
        "http://100.64.0.1",
      ]) {
        expect(validateServerUrl(host).valid, host).toBe(false);
      }
    });

    it("rejects IPv6 ULA in strict mode", async () => {
      const { validateServerUrl } = await importValidator();
      expect(validateServerUrl("http://[fc00::1]").valid).toBe(false);
      expect(validateServerUrl("http://[fd00::1]").valid).toBe(false);
    });
  });
});
