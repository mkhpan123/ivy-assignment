// Pulls the full dataset (listings, rentals, projects) from the Ivy Homes API
// and dumps it to data/*.json for offline analysis.
//
// Usage: node scripts/fetch-all.mjs

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const BASE_URL = "https://solve.ivy.homes";
const API_KEY = process.env.IVY_API_KEY || "IVY26-C9AFDB548E11";
const LOGIN_EMAIL = process.env.IVY_EMAIL || "demo1@ivy.homes";
const LOGIN_PASSWORD = process.env.IVY_PASSWORD || "6e76a8982c";

let accessToken = null;
let refreshToken = null;
let tokenObtainedAt = 0;
let expiresInMs = 0;

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  accessToken = body.access_token;
  refreshToken = body.refresh_token;
  tokenObtainedAt = Date.now();
  expiresInMs = body.expires_in * 1000;
  console.log(`logged in, token expires in ${body.expires_in}s`);
}

async function refresh() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    console.log("refresh failed, logging in again");
    return login();
  }
  const body = await res.json();
  accessToken = body.access_token;
  refreshToken = body.refresh_token;
  tokenObtainedAt = Date.now();
  expiresInMs = body.expires_in * 1000;
  console.log(`refreshed token, expires in ${body.expires_in}s`);
}

async function ensureToken() {
  if (!accessToken) return login();
  // refresh a bit early (30s buffer)
  if (Date.now() - tokenObtainedAt > expiresInMs - 30_000) return refresh();
}

async function apiGet(pathAndQuery, { retry = true } = {}) {
  await ensureToken();
  const res = await fetch(`${BASE_URL}${pathAndQuery}`, {
    headers: { "X-API-Key": API_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 && retry) {
    console.log(`401 on ${pathAndQuery}, refreshing token and retrying once`);
    await refresh();
    return apiGet(pathAndQuery, { retry: false });
  }
  if (!res.ok) {
    throw new Error(`GET ${pathAndQuery} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Pages through a collection endpoint using limit/offset (the shape the API
// actually returns, per has_more/offset/limit in the response — NOT the
// page/page_size shape the docs describe).
async function fetchAllPages(basePath, extraQuery = "") {
  const limit = 200;
  let offset = 0;
  let all = [];
  let total = null;
  while (true) {
    const qs = `limit=${limit}&offset=${offset}${extraQuery ? `&${extraQuery}` : ""}`;
    const page = await apiGet(`${basePath}?${qs}`);
    total = page.total;
    all = all.concat(page.results);
    console.log(`${basePath} offset=${offset} count=${page.results.length} total=${page.total} have=${all.length}`);
    if (!page.has_more || page.results.length === 0) break;
    offset += page.results.length;
  }
  if (total !== null && all.length !== total) {
    console.warn(`WARNING: ${basePath} collected ${all.length} records but total was ${total}`);
  }
  return all;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  console.log("=== fetching listings ===");
  const listings = await fetchAllPages("/v1/listings");
  await writeFile(path.join(DATA_DIR, "listings.json"), JSON.stringify(listings, null, 2));
  console.log(`saved ${listings.length} listings`);

  console.log("=== fetching rentals ===");
  const rentals = await fetchAllPages("/v1/rentals");
  await writeFile(path.join(DATA_DIR, "rentals.json"), JSON.stringify(rentals, null, 2));
  console.log(`saved ${rentals.length} rentals`);

  console.log("=== fetching projects ===");
  const projects = await fetchAllPages("/v1/projects");
  await writeFile(path.join(DATA_DIR, "projects.json"), JSON.stringify(projects, null, 2));
  console.log(`saved ${projects.length} projects`);

  console.log("=== fetching analytics summary ===");
  try {
    const summary = await apiGet("/v1/analytics/summary");
    await writeFile(path.join(DATA_DIR, "analytics-summary.json"), JSON.stringify(summary, null, 2));
    console.log("saved analytics summary");
  } catch (e) {
    console.error("analytics summary fetch failed:", e.message);
  }

  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
