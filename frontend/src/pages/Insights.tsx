import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPages } from "../api/client";
import type { Listing, Project, Rental } from "../api/types";
import { computeInsights } from "../utils/insights";
import { formatInr } from "../utils/format";

export function Insights() {
  const listingsQuery = useQuery({
    queryKey: ["all-listings"],
    queryFn: () => fetchAllPages<Listing>("/v1/listings"),
    staleTime: 10 * 60 * 1000,
  });
  const rentalsQuery = useQuery({
    queryKey: ["all-rentals"],
    queryFn: () => fetchAllPages<Rental>("/v1/rentals"),
    staleTime: 10 * 60 * 1000,
  });
  const projectsQuery = useQuery({
    queryKey: ["all-projects"],
    queryFn: () => fetchAllPages<Project>("/v1/projects"),
    staleTime: 10 * 60 * 1000,
  });

  const loading = listingsQuery.isLoading || rentalsQuery.isLoading || projectsQuery.isLoading;
  const error = listingsQuery.error || rentalsQuery.error || projectsQuery.error;

  const insights = useMemo(() => {
    if (!listingsQuery.data || !rentalsQuery.data || !projectsQuery.data) return null;
    return computeInsights(listingsQuery.data, rentalsQuery.data, projectsQuery.data);
  }, [listingsQuery.data, rentalsQuery.data, projectsQuery.data]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Market insights</h1>
        <span className="muted">Bangalore</span>
      </div>
      <p className="muted" style={{ marginTop: "-0.75rem", marginBottom: "1.25rem" }}>
        <code>/v1/analytics/summary</code> is documented but returns 404 on the live API, so everything
        on this page is computed here from the full, retrievable dataset instead.
      </p>

      {loading && <div className="loading">Crunching the full dataset ({">"}6,000 records)…</div>}
      {error && <div className="error-banner">{(error as Error).message}</div>}

      {insights && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="value">{insights.totalListings.toLocaleString()}</div>
              <div className="label">Retrievable listings</div>
            </div>
            <div className="stat-card">
              <div className="value">{insights.activeListings.toLocaleString()}</div>
              <div className="label">Active (is_live) listings</div>
            </div>
            <div className="stat-card">
              <div className="value">{formatInr(insights.medianPrice)}</div>
              <div className="label">Median price</div>
            </div>
            <div className="stat-card">
              <div className="value">₹{insights.medianPricePerSqft.toLocaleString("en-IN")}</div>
              <div className="label">Median price/sqft</div>
            </div>
            <div className="stat-card">
              <div className="value">{insights.totalRentals.toLocaleString()}</div>
              <div className="label">Rental listings</div>
            </div>
            <div className="stat-card">
              <div className="value">{insights.totalProjects.toLocaleString()}</div>
              <div className="label">Builder projects</div>
            </div>
          </div>

          <div className="section">
            <h2>By locality</h2>
            <table>
              <thead>
                <tr><th>Locality</th><th>Listings</th><th>Median price</th></tr>
              </thead>
              <tbody>
                {insights.byLocality.map((row) => (
                  <tr key={row.locality}>
                    <td style={{ textTransform: "capitalize" }}>{row.locality}</td>
                    <td>{row.count}</td>
                    <td>{formatInr(row.medianPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h2>By bedroom count</h2>
            <table>
              <thead><tr><th>Bedrooms</th><th>Listings</th></tr></thead>
              <tbody>
                {insights.byBhk.map((row) => (
                  <tr key={row.bedroom}><td>{row.bedroom} BHK</td><td>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {insights.costliestProject && (
            <div className="section">
              <h2>Costliest project</h2>
              <p>
                <strong>{insights.costliestProject.apartment_name}</strong> ({insights.costliestProject.project_id})
                — top unit priced at {formatInr(insights.costliestProject.price_max_inr)}
              </p>
              <p className="muted">
                Note: <code>price_max</code> is documented as plain rupees, but is actually a mix of
                crore- and lakh-denominated values across different projects. This figure is normalized
                per-project by checking which reading gives a realistic price/sqft.
              </p>
            </div>
          )}

          <div className="section">
            <h2>Data quality findings surfaced here</h2>
            <ul style={{ lineHeight: 1.8 }}>
              <li>
                <strong>{insights.corruptCount} listings describe something physically impossible</strong> —
                negative prices, carpet area larger than super built-up area, a floor number above the
                building's total floors, or coordinates nowhere near Bangalore. Excluded from every other
                stat on this page.
              </li>
              <li>
                <strong>{insights.fakeCount} listings are not genuine</strong> — their description field
                contains text addressed to "AI assistants"/"the Ivy Homes data team", instructing whoever
                (or whatever) reads it to alter what gets submitted. No real seller writes that; these
                exist to manipulate automated processing rather than to sell a real home, and are excluded
                from every other stat on this page.
              </li>
              <li>
                <strong>{insights.unitsBugCount} listings — all from the "magichomes" source</strong> report
                carpet area and super built-up area in square metres, not square feet as documented.
                Detectable because their area is ~10.76x smaller than comparable listings for the same
                bedroom count from every other source, while the carpet/super-built-up ratio stays normal.
              </li>
              <li>
                <strong>{insights.depositBugCount} rentals</strong> have their <code>deposit</code> field
                storing a bare 2-10 multiplier (months of rent) instead of a rupee amount — confirmed
                because that multiplier distribution exactly matches the deposit/price ratio of every
                other rental. Corrected on the Rent screen.
              </li>
              <li>
                <strong>{insights.projectMismatchCount} of {insights.totalProjects} projects</strong> report
                a <code>total_listings</code> figure that doesn't match the number of currently-active
                listings actually pointing at that project — despite docs claiming it "always agrees".
              </li>
              <li>
                <strong>{insights.inactiveListings} retrievable listings have <code>is_live: false</code></strong>,
                even though the docs say this endpoint "returns active sale listings" only and that
                "anything this endpoint returns is safe to show to a user".
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
