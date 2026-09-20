type Entry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Small in-memory cache for read-heavy, rarely-changing data (the quiz catalog
 * and question-id pools).
 *
 * - Concurrent misses for the same key share one loader call, so a cold cache
 *   under load hits the database once instead of once per request.
 * - `clear()` drops everything and discards any load that was in flight when it
 *   was called, so a stale result cannot be written back after an admin edit.
 * - Each server instance has its own cache, so a change made on one instance is
 *   visible on the others after at most `ttlMs`.
 */
export function createTtlCache<T>(ttlMs: number, maxEntries = 200) {
  const store = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();
  let generation = 0;

  async function get(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const pending = inflight.get(key);
    if (pending) return pending;

    const startedIn = generation;
    const load = loader()
      .then((value) => {
        if (startedIn === generation) {
          store.delete(key);
          store.set(key, { value, expiresAt: Date.now() + ttlMs });
          while (store.size > maxEntries) {
            const oldest = store.keys().next().value;
            if (oldest === undefined) break;
            store.delete(oldest);
          }
        }
        return value;
      })
      .finally(() => {
        if (inflight.get(key) === load) inflight.delete(key);
      });

    inflight.set(key, load);
    return load;
  }

  function clear() {
    generation += 1;
    store.clear();
    inflight.clear();
  }

  return { get, clear };
}
