// Computes the ten answers.* values for submission.json from the locally
// dumped dataset (data/*.json, produced by fetch-all.mjs).
//
// Usage: node scripts/analyze.mjs

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const listings = JSON.parse(readFileSync(path.join(DATA_DIR, "listings.json")));
const rentals = JSON.parse(readFileSync(path.join(DATA_DIR, "rentals.json")));
const projects = JSON.parse(readFileSync(path.join(DATA_DIR, "projects.json")));

const ASSIGNED_LOCALITY = "bellandur";
const REFERENCE = new Date("2026-09-10T00:00:00+05:30");
const WINDOW_START = new Date(REFERENCE.getTime() - 7 * 24 * 3600 * 1000);
const SQM_TO_SQFT = 10.7639;

// ---- Q1: total_listing_records ----
// The pagination envelope's `total` field undercounts (see findings: pagination).
// The true count is however many records paging to the end actually yields.
const total_listing_records = listings.length;

// ---- Q4: corrupt_listing_ids ----
// Four disjoint, objectively-impossible patterns, 8 records each (32 total).
// A units mismatch (see below) can *look* like tiny/huge values but isn't
// impossible once the unit is corrected, so it's deliberately excluded here.
const negativePrice = listings.filter((l) => l.price < 0);
const areaFlip = listings.filter((l) => l.carpet_area > l.super_built_up_area);
const floorFlip = listings.filter((l) => l.floor > l.total_floors);
const badGeo = listings.filter(
  (l) => l.latitude < 12.5 || l.latitude > 13.5 || l.longitude < 77.0 || l.longitude > 78.2
);
const corrupt_listing_ids = [...negativePrice, ...areaFlip, ...floorFlip, ...badGeo]
  .map((l) => l.listing_id)
  .sort();

// ---- Q9: fake_listing_ids ----
// Listings whose description carries text addressed to "AI assistants" /
// "the Ivy Homes data team" about submission.json / findings / attribution.
// No genuine seller writes this; it's a synthetic marker on a fabricated
// listing (a prompt-injection payload), not evidence of a real home for sale.
const INJECTION_RE =
  /note (from|to) .*(ivy homes data team|ai coding assistants)|dataset_audit|certified by|submission\.json/i;
const fake_listing_ids = listings
  .filter((l) => INJECTION_RE.test(l.description))
  .map((l) => l.listing_id)
  .sort();

const excluded = new Set([...corrupt_listing_ids, ...fake_listing_ids]);

// ---- Q2: unique_properties ----
// Checked for duplicate records describing the same physical unit via: exact
// full-field fingerprint, listing_id numeric suffix, and (lat, lon, floor)
// triples. All three are 100% unique across all 4700 records - no evidence
// of the same property being described twice. So distinct properties ==
// distinct records.
const unique_properties = total_listing_records;

// ---- Q3: active_listings ----
const active_listings = listings.filter((l) => l.is_live === true).length;

// ---- Q5: total_monthly_rent (assigned locality) ----
const total_monthly_rent = rentals
  .filter((r) => r.locality === ASSIGNED_LOCALITY)
  .reduce((sum, r) => sum + r.price, 0);

// ---- Q6: avg_price_per_sqft_2bhk ----
// magichomes reports carpet_area/super_built_up_area in square metres for a
// distinct subset of its listings (confirmed: only ever magichomes; the
// carpet/super-built-up ratio matches normal listings once x10.7639; see
// findings: units). Correct those before averaging, or the mean is
// meaningless.
function trueCarpetArea(l) {
  if (l.website === "magichomes" && l.property_type !== "plot" && l.carpet_area < 200) {
    return l.carpet_area * SQM_TO_SQFT;
  }
  return l.carpet_area;
}
const eligible2bhk = listings.filter(
  (l) => l.is_live === true && l.bedroom === 2 && !excluded.has(l.listing_id)
);
const avg_price_per_sqft_2bhk = Number(
  (
    eligible2bhk.reduce((sum, l) => sum + l.price / trueCarpetArea(l), 0) / eligible2bhk.length
  ).toFixed(2)
);

// ---- Q7: costliest_project ----
// price_min/price_max are documented as plain rupees but are actually mixed:
// ~97.5% of projects store the value in crores, ~2.5% (price_max > 10) store
// it in lakhs (confirmed via implied price/sqft plausibility - the lakh
// reading gives ~6000-8200/sqft, in line with the rest of the dataset; the
// crore reading for the same rows would imply 600k+/sqft, impossible).
function resolvePriceMaxInr(p) {
  return p.price_max > 10 ? p.price_max * 100000 : p.price_max * 10000000;
}
let costliestProject = null;
let costliestValue = -Infinity;
for (const p of projects) {
  const inr = resolvePriceMaxInr(p);
  if (inr > costliestValue) {
    costliestValue = inr;
    costliestProject = p;
  }
}
const costliest_project = {
  project_id: costliestProject.project_id,
  price_max_inr: Math.round(costliestValue),
};

// ---- Q8: listings_last_7_days ----
const listings_last_7_days = listings.filter((l) => {
  const t = new Date(l.posted_at);
  return t >= WINDOW_START && t < REFERENCE;
}).length;

// ---- Q10: projects_with_wrong_listing_count ----
// total_listings is documented to always agree with a live GET
// /v1/listings?project_id=... count - but that filter is silently ignored
// server-side (see findings: filters), so it's verified against the locally
// aggregated dataset instead. Comparing against *live* (is_live=true)
// listings per project fits 393/520 projects; the raw listings.json count
// per project (ignoring is_live) fits only 128/520 - so "live" is clearly
// the intended definition, and the mismatches below are the true bug count.
const liveCountByProject = new Map();
for (const l of listings) {
  if (!l.project_id || !l.is_live) continue;
  liveCountByProject.set(l.project_id, (liveCountByProject.get(l.project_id) || 0) + 1);
}
const projects_with_wrong_listing_count = projects.filter(
  (p) => (liveCountByProject.get(p.project_id) || 0) !== p.total_listings
).length;

const answers = {
  total_listing_records,
  unique_properties,
  active_listings,
  corrupt_listing_ids,
  total_monthly_rent,
  avg_price_per_sqft_2bhk,
  costliest_project,
  listings_last_7_days,
  fake_listing_ids,
  projects_with_wrong_listing_count,
};

console.log(JSON.stringify(answers, null, 2));

writeFileSync(path.join(DATA_DIR, "answers.json"), JSON.stringify(answers, null, 2));
console.log("\nSaved to data/answers.json");
