import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";
import { getResourceFileMap, invalidateResourceFileMap } from "./resource-map-cache";

const CONFIG_DIR = process.env.CONFIG_DIR ?? "/traefik-config";
const DATA_DIR = process.env.DATABASE_URL?.replace("file:", "").replace(/\/[^/]+$/, "") ?? "./data";
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

function isInside(parent: string, child: string): boolean {
  const parentResolved = path.resolve(parent);
  const childResolved = path.resolve(child);
  if (childResolved === parentResolved) return true;
  return childResolved.startsWith(parentResolved + path.sep);
}

function resolveConfigPath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    throw new Error("Path traversal attempt detected");
  }
  const resolved = path.resolve(CONFIG_DIR, filePath);
  if (!isInside(CONFIG_DIR, resolved)) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
}

function resolveTemplatePath(filePath: string): string {
  if (path.isAbsolute(filePath)) {
    throw new Error("Path traversal attempt detected");
  }
  const resolved = path.resolve(TEMPLATES_DIR, filePath);
  if (!isInside(TEMPLATES_DIR, resolved)) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
}

export async function listConfigFiles(): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (
        entry.name.endsWith(".yaml") ||
        entry.name.endsWith(".yml")
      ) {
        files.push(path.relative(CONFIG_DIR, fullPath));
      }
    }
  }

  try {
    await walk(CONFIG_DIR);
  } catch {
    // Directory may not exist in dev
  }

  return files.sort();
}

export async function readConfigFile(
  filePath: string
): Promise<{ content: string; parsed: unknown }> {
  const resolved = resolveConfigPath(filePath);
  const content = await fs.readFile(resolved, "utf-8");
  const parsed = yaml.parse(content);
  return { content, parsed };
}

export async function writeConfigFile(
  filePath: string,
  content: string
): Promise<void> {
  const resolved = resolveConfigPath(filePath);

  // Validate YAML before writing
  try {
    yaml.parse(content);
  } catch (e) {
    throw new Error(
      `Invalid YAML: ${e instanceof Error ? e.message : "parse error"}`
    );
  }

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");
  invalidateResourceFileMap(CONFIG_DIR);
}

export function parseYaml(content: string): unknown {
  return yaml.parse(content);
}

export function stringifyYaml(data: unknown): string {
  return yaml.stringify(data, { indent: 2 });
}

export async function deleteConfigFile(filePath: string): Promise<void> {
  const resolved = resolveConfigPath(filePath);
  await fs.unlink(resolved);
  invalidateResourceFileMap(CONFIG_DIR);
}

// --- Template helpers ---

export async function listTemplateFiles(): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isFile() &&
        (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))
      ) {
        files.push(entry.name);
      }
    }
  } catch {
    // Templates directory may not exist yet
  }

  return files.sort();
}

export async function readTemplateFile(
  filePath: string
): Promise<{ content: string }> {
  const resolved = resolveTemplatePath(filePath);
  const content = await fs.readFile(resolved, "utf-8");
  return { content };
}

export async function writeTemplateFile(
  filePath: string,
  content: string
): Promise<void> {
  const resolved = resolveTemplatePath(filePath);
  await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  await fs.writeFile(resolved, content, "utf-8");
}

export async function deleteTemplateFile(filePath: string): Promise<void> {
  const resolved = resolveTemplatePath(filePath);
  await fs.unlink(resolved);
}

// --- Rename helpers ---

export async function renameConfigFile(
  oldPath: string,
  newPath: string
): Promise<void> {
  const resolvedOld = resolveConfigPath(oldPath);
  const resolvedNew = resolveConfigPath(newPath);

  await fs.access(resolvedOld);

  try {
    await fs.access(resolvedNew);
    throw new Error(`File "${newPath}" already exists`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) throw e;
  }

  await fs.mkdir(path.dirname(resolvedNew), { recursive: true });
  await fs.rename(resolvedOld, resolvedNew);
  invalidateResourceFileMap(CONFIG_DIR);
}

export async function renameTemplateFile(
  oldPath: string,
  newPath: string
): Promise<void> {
  const resolvedOld = resolveTemplatePath(oldPath);
  const resolvedNew = resolveTemplatePath(newPath);

  await fs.access(resolvedOld);

  try {
    await fs.access(resolvedNew);
    throw new Error(`File "${newPath}" already exists`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) throw e;
  }

  await fs.rename(resolvedOld, resolvedNew);
}

// --- Resource-to-file mapping ---

/**
 * Return the cached mapping of Traefik resources to their defining config files.
 * Rebuild after helper mutations or external filesystem changes.
 * Returns e.g. { "myrouter@file": "myconfig.yaml", "myservice@file": "myconfig.yaml" }
 */
export function buildResourceFileMap(): Promise<Record<string, string>> {
  return getResourceFileMap(CONFIG_DIR, rebuildResourceFileMap);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function rebuildResourceFileMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const files = await listConfigFiles();

  for (const file of files) {
    try {
      const { parsed } = await readConfigFile(file);
      if (!isRecord(parsed) || !isRecord(parsed.http)) continue;
      const http = parsed.http;

      for (const section of ["routers", "services", "middlewares"] as const) {
        const items = http[section];
        if (!isRecord(items)) continue;
        for (const name of Object.keys(items)) {
          map[`${name}@file`] = file;
        }
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  return map;
}

// --- Duplicate config ---

export async function copyConfigFile(
  sourcePath: string,
  destPath: string
): Promise<void> {
  const resolvedSource = resolveConfigPath(sourcePath);
  const resolvedDest = resolveConfigPath(destPath);

  // Check source exists
  await fs.access(resolvedSource);

  // Don't overwrite existing files
  try {
    await fs.access(resolvedDest);
    throw new Error(`File "${destPath}" already exists`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("already exists")) throw e;
    // File doesn't exist, good to proceed
  }

  await fs.mkdir(path.dirname(resolvedDest), { recursive: true });
  await fs.copyFile(resolvedSource, resolvedDest);
  invalidateResourceFileMap(CONFIG_DIR);
}
