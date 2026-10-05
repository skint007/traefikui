import { watch, type FSWatcher } from "chokidar";
import * as path from "path";

export type WatchEvent = {
  type: "add" | "change" | "unlink";
  path: string;
  timestamp: number;
};

type WatchListener = (event: WatchEvent) => void;

class ConfigWatcher {
  private watcher: FSWatcher | null = null;
  private ready: Promise<void> | undefined;
  private error: Error | undefined;
  private listeners = new Set<WatchListener>();

  constructor(private readonly configDir: string) {}

  start(): Promise<void> {
    if (this.error) return Promise.reject(this.error);
    if (this.ready) return this.ready;

    const watcher = watch(this.configDir, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    this.watcher = watcher;
    this.ready = new Promise((resolve, reject) => {
      watcher.once("ready", resolve);
      watcher.on("error", (error) => {
        this.error = error instanceof Error ? error : new Error("Config watcher failed");
        reject(this.error);
      });
    });

    const handleEvent = (type: WatchEvent["type"]) => (filePath: string) => {
      const event: WatchEvent = {
        type,
        path: path.relative(this.configDir, filePath),
        timestamp: Date.now(),
      };
      this.listeners.forEach((listener) => listener(event));
    };

    watcher.on("add", handleEvent("add"));
    watcher.on("change", handleEvent("change"));
    watcher.on("unlink", handleEvent("unlink"));
    return this.ready;
  }

  subscribe(listener: WatchListener): () => void {
    this.listeners.add(listener);
    // Map readers await startup themselves; SSE subscribers have no await path.
    void this.start().catch(() => {});
    return () => {
      this.listeners.delete(listener);
    };
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.ready = undefined;
      this.error = undefined;
    }
  }
}

declare global {
  var traefikConfigWatchers: Map<string, ConfigWatcher> | undefined;
}

const watchers = globalThis.traefikConfigWatchers ??= new Map();

/** Share filesystem events across route bundles and cache readers in all modes. */
export function getConfigWatcher(configDir: string): ConfigWatcher {
  const directory = path.resolve(configDir);
  let watcher = watchers.get(directory);
  if (!watcher) {
    watcher = new ConfigWatcher(directory);
    watchers.set(directory, watcher);
  }
  return watcher;
}

export const configWatcher = getConfigWatcher(
  process.env.CONFIG_DIR ?? "/traefik-config"
);
