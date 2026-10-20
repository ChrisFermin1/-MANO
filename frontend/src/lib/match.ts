// Is the name in this note one of Carlos's clients? "Atlanta Homeiker" = "ATL Homemaker", "Juan Perez" = "Juan Pérez",
// but "Maria Lopez" ≠ "Maria Rodriguez". Plain functions (no app imports), used when a new job is made.

const words = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(llc|inc|co|corp|the)\b/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function edits(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

// "atl" ~ "atlanta" (short form), "homeiker" ~ "homemaker" (misspelled)
const sameWord = (a: string, b: string) =>
  a === b ||
  (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a))) ||
  (Math.min(a.length, b.length) >= 4 && 1 - edits(a, b) / Math.max(a.length, b.length) >= 0.7);

export function sameClient(x: string, y: string): boolean {
  const a = words(x);
  const b = words(y);
  if (!a.length || !b.length) return false;
  if (a.join(" ") === b.join(" ")) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 2) return false; // just "Maria" could be anyone
  return short.every((w) => long.some((v) => sameWord(w, v)));
}

/** The first client whose name matches any of these (what Mano heard, its spelling suggestion). */
export function matchClient<T extends { name: string }>(names: (string | null | undefined)[], clients: T[]): T | null {
  for (const n of names) {
    if (!n?.trim()) continue;
    const hit = clients.find((c) => sameClient(n, c.name));
    if (hit) return hit;
  }
  return null;
}
