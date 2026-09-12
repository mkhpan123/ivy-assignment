export function formatInr(value: number): string {
  if (value < 0) return `-${formatInr(-value)}`;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
