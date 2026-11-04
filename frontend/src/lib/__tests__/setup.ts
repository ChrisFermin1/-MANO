import { beforeEach } from "vitest";

// The app keeps its data in localStorage today; tests get a fresh, empty one each time.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, String(v));
  removeItem = (k: string) => void this.data.delete(k);
  clear = () => this.data.clear();
  key = (i: number) => [...this.data.keys()][i] ?? null;
  get length() {
    return this.data.size;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});
