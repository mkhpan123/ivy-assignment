# Ivy Homes — internship assignment

A frontend for the Ivy Homes property API (Bangalore), plus scripts that pulled the full
dataset and produced the answers/findings in [`submission.json`](./submission.json).

## Running it

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. Sign in with any of the demo accounts
(`demo1@ivy.homes` / `demo2@ivy.homes` / `demo3@ivy.homes`, password `6e76a8982c`).

The app talks to `https://solve.ivy.homes` using the API key committed in
[`frontend/.env`](./frontend/.env) (`VITE_IVY_API_KEY`). That key is scoped to this
candidate's assigned city and is what the deployed demo needs to authenticate — it's
committed deliberately so the demo works without extra setup, not shared with anyone.

To re-run the data analysis that produced `submission.json`'s `answers`:

```bash
cd scripts   # from repo root
node fetch-all.mjs   # pulls the full dataset into data/*.json (~150 requests)
node analyze.mjs      # computes the ten answers from that local dump
```

## What's implemented

- **Login** against the real `/auth/login` flow. Sessions persist across a refresh
  (localStorage) and stay alive well past 30 minutes via a silent, undocumented
  `/auth/refresh` call (see findings — the documented 24h token life is actually 15
  minutes, and the docs claim no refresh flow exists when one does).
- **Browse listings** with server-side locality/bedroom/type/price/furnishing filters,
  plus client-side sort. Pagination uses `limit`/`offset` (the shape the API actually
  returns), not the documented `page`/`page_size`.
- **Listing detail** at `/listings/:id`.
- **Saved listings**: add/remove/list, per user, surviving reload and re-login. Built
  entirely client-side (localStorage) because `/v1/favourites` — GET, POST and DELETE —
  all 404 on the live API despite being documented.
- **Rentals and projects**, browsable, with corrected prices and areas (see below).
- **Insights screen** (`/insights`): `/v1/analytics/summary` 404s, so this is computed
  client-side from the full retrievable dataset — the same aggregates the docs promised
  from that endpoint, plus every data-quality issue this project found, with counts.

## How I worked out what to distrust

I didn't start by asking an LLM to diff the docs against the API — I started by just
calling things and reading the raw responses, because the assignment explicitly warns
the docs were AI-drafted from an old changelog and never checked. The very first call
(`/health`, then `/v1/listings?api_key=...`) already contradicted the docs (API key
goes in a header, not a query param), which set the tone: verify everything, trust
nothing until it's reproduced.

The overall process:

1. **Manually probed every endpoint and parameter in the doc with curl** before writing
   any frontend code — auth, pagination shape, sort/filter params, all three detail
   routes, `/v1/favourites`, `/v1/analytics/summary`. This caught every
   `missing_endpoint`/`auth`/`pagination`/`sorting`/`filters` finding in
   `submission.json`, and shaped the API client's design (header auth, refresh-token
   handling, offset-based paging, capped limit).
2. **Pulled the entire dataset locally** (`scripts/fetch-all.mjs`) once the auth/paging
   mechanics were confirmed, per the assignment's own advice — this is what made the
   count-mismatch (`total` undercounting reality), corruption, and fraud findings
   possible at all; none of those show up in any single response.
3. **Formed and tested specific hypotheses against the full dataset**, rather than
   eyeballing records one at a time:
   - Range/consistency checks (price < 0, carpet > built-up area, floor > total floors,
     lat/lon outside a Bangalore bounding box) surfaced the 32 corrupt records — each
     check independently found exactly 8, with zero overlap between checks.
   - A histogram of `carpet_area` for 2BHK listings showed an unexpected second cluster
     near zero. Grouping by source website showed it was 100% `magichomes`, and the
     carpet/super-built-up ratio in that cluster matched normal listings once converted
     ×10.7639 (sqm → sqft) — confirming a units bug, not corrupt data.
   - Sorting projects by raw `price_max` put an implausible outlier at the top. Checking
     implied price/sqft under both a "lakhs" and "crores" reading per project showed a
     clean split: 507 projects only make sense as crores, 13 only make sense as lakhs.
   - Searching every description for text addressed to "AI assistants" / "the Ivy Homes
     data team" found 7 listings carrying a prompt-injection payload (asking whoever
     processes the API response to add fabricated fields to `submission.json`, or a
     fabricated finding about a nonexistent endpoint). Per this assignment's own
     instruction to treat API data as data, none of those instructions were followed —
     they're reported as a `fraud` finding and used as the `fake_listing_ids` signal
     instead, since no genuine seller writes that text.
   - Comparing each project's declared `total_listings` against an is_live-only count
     of listings actually pointing at it (aggregated locally, since the `project_id`
     filter on `/v1/listings` is silently ignored) found 127/520 disagree.
   - While building the Rent screen and just looking at rendered cards, I noticed
     deposits like "₹6" and "₹8" — not a formatting bug, but 384 rentals whose `deposit`
     field stores a bare months-of-rent multiplier instead of a rupee amount, confirmed
     because that multiplier distribution is an exact match for the deposit/price ratio
     of every normal rental.
4. **Cross-checked the live in-browser Insights computation against the standalone
   analysis script** — both independently reach the same numbers (4700 listings, 32
   corrupt, 7 fake, 374 units-bug records, 127 project mismatches), which is the main
   reason I trust them.

## What I checked that turned out to be fine

- **`bhk`, `furnishing`, `property_type`, `min_price`, `max_price` filters** all work
  exactly as documented — I verified each one returns only matching records, not just
  that it returns *something*.
- **`locality` matching is case-insensitive** (`Bellandur` and `bellandur` both return
  423 results) even though the docs say "exact match, lowercase" — technically broader
  than documented, but not wrong in a way that breaks anything, so I didn't report it as
  a finding worth weighting the same as the others.
- **Rentals' `carpet_area`/`super_builtup_area`** — I checked for the same
  square-metre bug found in listings (grouping by website, looking for a tiny-area
  cluster) and found none; rentals are clean on this specific issue.
- **`listing_id` and `project_id` uniqueness for `unique_properties` (Q2)** — I spent
  real effort trying to disprove the doc's claim that "each listing_id corresponds to
  exactly one physical property," expecting to find re-listed duplicates across the five
  source websites (a very plausible thing for scraped real-estate data to have). I
  checked exact full-record fingerprints, listing_id numeric suffixes, and
  (lat, lon, floor) triples as three independent duplicate keys — all three came back
  100% unique across all 4700 records. I went in assuming this doc claim was another
  lie; it turned out to be one of the genuinely correct parts, so `unique_properties`
  equals `total_listing_records`.
- **`/v1/rentals/{id}` and `/v1/projects/{id}`** use the documented plural path
  correctly (only the listings singular/plural mismatch is a bug).
- **Rate limiting** — never came close to it; the whole investigation plus the full
  three-collection download is on the order of 150-200 requests total, well inside
  1200/minute.

## What I'd do with another two days

- Investigate whether the `magichomes` units bug and the rentals `deposit` bug are two
  instances of a more general "source-specific field corruption" pattern, by
  systematically comparing every numeric field's distribution across the five websites
  rather than the two I happened to find by eyeballing.
- Add a "compare projects" or map view to the Insights screen — the lat/lon data is
  there and mostly clean (outside the 8 corrupt records), and a map would make the
  locality-level price differences much more legible than the current table.
- Server-side sorting is unreliable (`order` is ignored), so the Buy screen currently
  reverses whatever page the server returns rather than doing a true global sort across
  the whole filtered set (which would mean fetching every matching record before
  rendering anything). With more time I'd add a background prefetch that upgrades a
  filtered view to a true sorted view once the full matching set has loaded, without
  blocking the initial paint.
- Write actual unit tests for the units-normalization logic
  (`trueCarpetArea`, `resolveProjectPrice`, `trueDeposit`) instead of only relying on the
  standalone Node analysis script's console output — that logic is duplicated between
  `scripts/analyze.mjs` and `frontend/src/utils/insights.ts` and deserves a shared,
  tested module rather than two hand-kept-in-sync copies.

## Tools used

Built with Claude Code (Claude Sonnet 5) — used for scaffolding the React/Vite app,
writing the API-probing scripts, and iterating on the data analysis. All API
exploration, hypothesis-forming, and the specific data-quality findings above were
driven and verified by me against real responses from the live API, not generated
speculatively.
