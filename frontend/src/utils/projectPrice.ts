import type { Project } from "../api/types";

// price_min/price_max are documented as plain rupees but aren't: ~97.5% of
// projects store the value in crores (e.g. 2.13) and a small subset (raw
// value > 10) store it in lakhs (e.g. 99.8) instead. Confirmed by checking
// implied price/sqft: the lakh reading for the >10 group lands at a
// realistic ~6000-8200/sqft, while reading the same rows as crores would
// imply 600k+/sqft, which nothing in this dataset supports. See
// findings: units.
export function resolveProjectPrice(rawValue: number): number {
  return rawValue > 10 ? rawValue * 100000 : rawValue * 10000000;
}

export function projectPriceRange(p: Project): { min: number; max: number } {
  return { min: resolveProjectPrice(p.price_min), max: resolveProjectPrice(p.price_max) };
}
