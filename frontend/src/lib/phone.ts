// US phone numbers, as Carlos types them: "4045550123" → "(404) 555-0123". A number that starts with "+"
// (a client with a Mexico number) is left exactly as typed.

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** "(404) 555-0123", built as he types. Also fixes numbers saved before ("404-555-0123", "14045550123"). */
export function formatPhone(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw || raw.startsWith("+")) return raw;
  let d = digitsOf(raw);
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1); // leading 1 = US country code
  if (d.length > 10) return raw; // not a US number: as typed
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** For an input's onChange: format, and make backspace over ")" or "-" delete a digit instead of getting stuck. */
export function nextPhone(prev: string, typed: string): string {
  if (typed.trim().startsWith("+")) return typed;
  const erasedSymbol = typed.length < prev.length && digitsOf(typed) === digitsOf(prev);
  return formatPhone(erasedSymbol ? digitsOf(typed).slice(0, -1) : typed);
}

/** A number a client can actually call: 10 digits (area code included), or an international "+…" number. */
export function isFullPhone(input: string | null | undefined): boolean {
  const raw = (input ?? "").trim();
  const d = digitsOf(raw);
  if (raw.startsWith("+")) return d.length >= 8;
  return d.length === 10 || (d.length === 11 && d.startsWith("1"));
}
