import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Re-import after env mutation so the module picks up the new CONFIG_DIR.
async function importHelpers() {
  return await import("../yaml-helpers");
}

describe("yaml-helpers path-traversal protection", () => {
  let tmpRoot: string;
  let originalConfigDir: string | undefined;

  beforeEach(() => {
    originalConfigDir = process.env.CONFIG_DIR;
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "traefikui-pt-"));
    process.env.CONFIG_DIR = path.join(tmpRoot, "traefik-config");
    fs.mkdirSync(process.env.CONFIG_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.CONFIG_DIR, "ok.yaml"), "ok: true\n");
    // Sibling whose path shares the prefix — the prefix-collision attack target.
    fs.mkdirSync(path.join(tmpRoot, "traefik-config-evil"), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, "traefik-config-evil", "secret.yaml"), "secret: data\n");
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    if (originalConfigDir !== undefined) {
      process.env.CONFIG_DIR = originalConfigDir;
    } else {
      delete process.env.CONFIG_DIR;
    }
  });

  it("reads files inside the config dir", async () => {
    const { readConfigFile } = await importHelpers();
    const r = await readConfigFile("ok.yaml");
    expect(r.content).toBe("ok: true\n");
  });

  it("rejects parent-dir traversal", async () => {
    const { readConfigFile } = await importHelpers();
    await expect(readConfigFile("../etc/passwd")).rejects.toThrow(
      "Path traversal attempt detected",
    );
  });

  it("rejects absolute paths", async () => {
    const { readConfigFile } = await importHelpers();
    await expect(readConfigFile("/etc/passwd")).rejects.toThrow(
      "Path traversal attempt detected",
    );
  });

  it("rejects sibling directories that share the prefix string", async () => {
    // This is the FIND-001 regression: '/traefik-config-evil/...' starts with
    // '/traefik-config' and previously bypassed the sandbox.
    const { readConfigFile } = await importHelpers();
    await expect(
      readConfigFile("../traefik-config-evil/secret.yaml"),
    ).rejects.toThrow("Path traversal attempt detected");
  });

  it("rejects writes that escape via traversal", async () => {
    const { writeConfigFile } = await importHelpers();
    await expect(
      writeConfigFile("../traefik-config-evil/x.yaml", "x: 1\n"),
    ).rejects.toThrow("Path traversal attempt detected");
  });
});
