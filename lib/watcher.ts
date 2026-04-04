import { watch, type FSWatcher } from "chokidar";

export type WatchEvent = {
  type: "add" | "change" | "unlink";
  path: string;
  timestamp: number;
};

type WatchListener = (event: WatchEvent) => void;

class ConfigWatcher {
  private watcher: FSWatcher | null = null;
  private listeners = new Set<WatchListener>();
  private configDir: string;

  constructor() {
    this.configDir = process.env.CONFIG_DIR ?? "/traefik-config";
  }

  start() {
    if (this.watcher) return;

    this.watcher = watch(this.configDir, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    const handleEvent = (type: WatchEvent["type"]) => (filePath: string) => {
      const event: WatchEvent = {
        type,
        path: filePath.replace(this.configDir, "").replace(/^\//, ""),
        timestamp: Date.now(),
      };
      this.listeners.forEach((listener) => listener(event));
    };

    this.watcher.on("add", handleEvent("add"));
    this.watcher.on("change", handleEvent("change"));
    this.watcher.on("unlink", handleEvent("unlink"));
  }

  subscribe(listener: WatchListener): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.start();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}

// Singleton instance
const globalForWatcher = globalThis as unknown as {
  configWatcher: ConfigWatcher | undefined;
};

export const configWatcher =
  globalForWatcher.configWatcher ?? new ConfigWatcher();

if (process.env.NODE_ENV !== "production") {
  globalForWatcher.configWatcher = configWatcher;
}
