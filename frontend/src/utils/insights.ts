import type { Listing, Project, Rental } from "../api/types";

const SQM_TO_SQFT = 10.7639;
const INJECTION_RE =
  /note (from|to) .*(ivy homes data team|ai coding assistants)|dataset_audit|certified by|submission\.json/i;

export function findCorruptListingIds(listings: Listing[]): string[] {
  const negativePrice = listings.filter((l) => l.price < 0);
  const areaFlip = listings.filter((l) => l.carpet_area > l.super_built_up_area);
  const floorFlip = listings.filter((l) => l.floor > l.total_floors);
  const badGeo = listings.filter(
    (l) => l.latitude < 12.5 || l.latitude > 13.5 || l.longitude < 77.0 || l.longitude > 78.2
  );
  return [...negativePrice, ...areaFlip, ...floorFlip, ...badGeo].map((l) => l.listing_id);
}

export function findFakeListingIds(listings: Listing[]): string[] {
  return listings.filter((l) => INJECTION_RE.test(l.description)).map((l) => l.listing_id);
}

export function trueCarpetArea(l: Listing): number {
  if (l.website === "magichomes" && l.property_type !== "plot" && l.carpet_area < 200) {
    return l.carpet_area * SQM_TO_SQFT;
  }
  return l.carpet_area;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function resolveProjectPriceMax(rawValue: number): number {
  return rawValue > 10 ? rawValue * 100000 : rawValue * 10000000;
}

export interface Insights {
  totalListings: number;
  activeListings: number;
  inactiveListings: number;
  medianPrice: number;
  medianPricePerSqft: number;
  byLocality: { locality: string; count: number; medianPrice: number }[];
  byBhk: { bedroom: number; count: number }[];
  corruptCount: number;
  corruptIds: string[];
  fakeCount: number;
  fakeIds: string[];
  unitsBugCount: number;
  depositBugCount: number;
  projectMismatchCount: number;
  costliestProject: { project_id: string; apartment_name: string; price_max_inr: number } | null;
  totalRentals: number;
  totalProjects: number;
}

export function computeInsights(listings: Listing[], rentals: Rental[], projects: Project[]): Insights {
  const corruptIds = findCorruptListingIds(listings);
  const fakeIds = findFakeListingIds(listings);
  const corruptSet = new Set(corruptIds);

  const live = listings.filter((l) => l.is_live);
  const validForStats = live.filter((l) => !corruptSet.has(l.listing_id));

  const prices = validForStats.map((l) => l.price);
  const psfs = validForStats.map((l) => l.price / trueCarpetArea(l));

  const byLocalityMap = new Map<string, number[]>();
  for (const l of validForStats) {
    const arr = byLocalityMap.get(l.locality) ?? [];
    arr.push(l.price);
    byLocalityMap.set(l.locality, arr);
  }
  const byLocality = [...byLocalityMap.entries()]
    .map(([locality, arr]) => ({ locality, count: arr.length, medianPrice: median(arr) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const byBhkMap = new Map<number, number>();
  for (const l of validForStats) byBhkMap.set(l.bedroom, (byBhkMap.get(l.bedroom) ?? 0) + 1);
  const byBhk = [...byBhkMap.entries()]
    .map(([bedroom, count]) => ({ bedroom, count }))
    .sort((a, b) => a.bedroom - b.bedroom);

  const depositBugCount = rentals.filter((r) => r.deposit < 1000).length;

  const magichomesUnitsBug = listings.filter(
    (l) => l.website === "magichomes" && l.property_type !== "plot" && l.carpet_area < 200
  ).length;

  const liveCountByProject = new Map<string, number>();
  for (const l of listings) {
    if (!l.project_id || !l.is_live) continue;
    liveCountByProject.set(l.project_id, (liveCountByProject.get(l.project_id) ?? 0) + 1);
  }
  const projectMismatchCount = projects.filter(
    (p) => (liveCountByProject.get(p.project_id) ?? 0) !== p.total_listings
  ).length;

  let costliestProject: Insights["costliestProject"] = null;
  let best = -Infinity;
  for (const p of projects) {
    const inr = resolveProjectPriceMax(p.price_max);
    if (inr > best) {
      best = inr;
      costliestProject = { project_id: p.project_id, apartment_name: p.apartment_name, price_max_inr: Math.round(inr) };
    }
  }

  return {
    totalListings: listings.length,
    activeListings: live.length,
    inactiveListings: listings.length - live.length,
    medianPrice: median(prices),
    medianPricePerSqft: Math.round(median(psfs)),
    byLocality,
    byBhk,
    corruptCount: corruptIds.length,
    corruptIds,
    fakeCount: fakeIds.length,
    fakeIds,
    unitsBugCount: magichomesUnitsBug,
    depositBugCount,
    projectMismatchCount,
    costliestProject,
    totalRentals: rentals.length,
    totalProjects: projects.length,
  };
}
