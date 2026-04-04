import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";

const CONFIG_DIR = process.env.CONFIG_DIR ?? "/traefik-config";
const DATA_DIR = process.env.DATABASE_URL?.replace("file:", "").replace(/\/[^/]+$/, "") ?? "./data";
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

function resolveConfigPath(filePath: string): string {
  const resolved = path.resolve(CONFIG_DIR, filePath);
  if (!resolved.startsWith(path.resolve(CONFIG_DIR))) {
    throw new Error("Path traversal attempt detected");
  }
  return resolved;
}

function resolveTemplatePath(filePath: string): string {
  const resolved = path.resolve(TEMPLATES_DIR, filePath);
  if (!resolved.startsWith(path.resolve(TEMPLATES_DIR))) {
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
 * Build a map from Traefik resource name to the config file that defines it.
 * Parses all config files and extracts router/service/middleware names.
 * Returns e.g. { "myrouter@file": "myconfig.yaml", "myservice@file": "myconfig.yaml" }
 */
export async function buildResourceFileMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const files = await listConfigFiles();

  for (const file of files) {
    try {
      const { parsed } = await readConfigFile(file);
      const config = parsed as Record<string, unknown> | null;
      if (!config?.http) continue;

      const http = config.http as Record<string, unknown>;

      for (const section of ["routers", "services", "middlewares"] as const) {
        const items = http[section] as Record<string, unknown> | undefined;
        if (!items) continue;
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
}
