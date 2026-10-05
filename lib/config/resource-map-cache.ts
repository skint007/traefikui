import * as path from "path";
import { getConfigWatcher } from "../watcher";

type ResourceFileMap = Record<string, string>;
type BuildResourceFileMap = () => Promise<ResourceFileMap>;

/** Shares a rebuild and retries if files change before that rebuild finishes. */
export class ResourceFileMapCache {
  private generation = 0;
  private cached: ResourceFileMap | undefined;
  private inFlight: Promise<ResourceFileMap> | undefined;

  invalidate() {
    this.generation++;
    this.cached = undefined;
  }

  get(build: BuildResourceFileMap): Promise<ResourceFileMap> {
    if (this.cached) return Promise.resolve(this.cached);
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.rebuild(build).finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async rebuild(build: BuildResourceFileMap): Promise<ResourceFileMap> {
    while (true) {
      const generation = this.generation;
      const map = await build();
      if (generation !== this.generation) continue;
      this.cached = map;
      return map;
    }
  }
}

type CacheEntry = {
  cache: ResourceFileMapCache;
  ready: Promise<void>;
};

declare global {
  var traefikResourceFileMapCaches: Map<string, CacheEntry> | undefined;
}

// Next.js can load the same helper from separate route bundles in production.
const caches = globalThis.traefikResourceFileMapCaches ??= new Map();

export function invalidateResourceFileMap(configDir: string) {
  caches.get(path.resolve(configDir))?.cache.invalidate();
}

export async function getResourceFileMap(
  configDir: string,
  build: BuildResourceFileMap
): Promise<ResourceFileMap> {
  const directory = path.resolve(configDir);
  let entry = caches.get(directory);
  const watcher = getConfigWatcher(directory);
  const ready = watcher.start();
  if (!entry) {
    const cache = new ResourceFileMapCache();
    entry = { cache, ready };
    caches.set(directory, entry);
    watcher.subscribe(() => cache.invalidate());
  } else if (entry.ready !== ready) {
    // Files may have changed while a stopped watcher was not listening.
    entry.ready = ready;
    entry.cache.invalidate();
  }
  // Finish the initial watch scan before reading, so it cannot swallow a change
  // as an ignored initial event while the first map is being built.
  await ready;
  return entry.cache.get(build);
}
