import { describe, it, expect } from "vitest";
import { validateServerUrl } from "../validate-url";

describe("validateServerUrl", () => {
  it("accepts public http URLs", () => {
    expect(validateServerUrl("http://example.com").valid).toBe(true);
    expect(validateServerUrl("https://example.com:8080/path").valid).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(validateServerUrl("file:///etc/passwd").valid).toBe(false);
    expect(validateServerUrl("ftp://example.com").valid).toBe(false);
    expect(validateServerUrl("javascript:alert(1)").valid).toBe(false);
  });

  it("rejects localhost variants", () => {
    expect(validateServerUrl("http://localhost").valid).toBe(false);
    expect(validateServerUrl("http://0.0.0.0").valid).toBe(false);
    expect(validateServerUrl("http://foo.localhost").valid).toBe(false);
  });

  it("rejects IPv4 private and loopback ranges", () => {
    for (const host of [
      "http://127.0.0.1",
      "http://127.5.5.5",
      "http://10.0.0.1",
      "http://172.16.0.1",
      "http://172.31.0.1",
      "http://192.168.1.1",
      "http://169.254.169.254",
      "http://0.0.0.5",
    ]) {
      expect(validateServerUrl(host).valid, host).toBe(false);
    }
  });

  it("rejects IPv6 loopback and link-local", () => {
    expect(validateServerUrl("http://[::1]").valid).toBe(false);
    expect(validateServerUrl("http://[fe80::1]").valid).toBe(false);
    expect(validateServerUrl("http://[fc00::1]").valid).toBe(false);
    expect(validateServerUrl("http://[fd00::1]").valid).toBe(false);
  });

  it("rejects IPv4-mapped IPv6 of blocked addresses", () => {
    expect(validateServerUrl("http://[::ffff:127.0.0.1]").valid).toBe(false);
    expect(validateServerUrl("http://[::ffff:169.254.169.254]").valid).toBe(false);
  });

  it("rejects cloud metadata hostnames", () => {
    expect(validateServerUrl("http://metadata.google.internal").valid).toBe(false);
    expect(validateServerUrl("http://metadata").valid).toBe(false);
  });

  it("rejects CGNAT and multicast ranges", () => {
    expect(validateServerUrl("http://100.64.0.1").valid).toBe(false);
    expect(validateServerUrl("http://224.0.0.1").valid).toBe(false);
  });
});
