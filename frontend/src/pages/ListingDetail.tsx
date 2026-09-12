import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { Listing } from "../api/types";
import { formatInr, titleCase } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { isFavourite, toggleFavourite } from "../api/favourites";

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => apiFetch<Listing>(`/v1/listings/${id}`),
    enabled: !!id,
  });
  const [fav, setFav] = useState(() => (user && id ? isFavourite(user.email, id) : false));

  if (isLoading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="error-banner">{(error as Error).message}</div></div>;
  if (!listing) return null;

  return (
    <div className="page">
      <Link to="/listings" className="muted">
        ← Back to listings
      </Link>
      <div className="section" style={{ marginTop: "1rem" }}>
        <div className="page-header">
          <h1>
            {listing.bedroom} BHK {titleCase(listing.property_type)} in {listing.apartment_name}
          </h1>
          <button
            className={`btn ${fav ? "btn-primary" : ""}`}
            onClick={() => {
              if (!user || !id) return;
              toggleFavourite(user.email, id);
              setFav((f) => !f);
            }}
          >
            {fav ? "♥ Saved" : "♡ Save"}
          </button>
        </div>
        <p className="muted" style={{ textTransform: "capitalize" }}>{listing.locality}</p>
        <div className="card-price" style={{ fontSize: "1.6rem", margin: "0.5rem 0" }}>
          {formatInr(listing.price)}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {listing.is_verified && <span className="badge badge-verified">Verified</span>}
          {!listing.is_live && <span className="badge badge-inactive">Inactive</span>}
        </div>
        <p>{listing.description}</p>
      </div>

      <div className="section">
        <h2>Details</h2>
        <table>
          <tbody>
            <tr><td>Carpet area</td><td>{listing.carpet_area} sqft</td></tr>
            <tr><td>Super built-up area</td><td>{listing.super_built_up_area} sqft</td></tr>
            <tr><td>Bathrooms</td><td>{listing.bathroom}</td></tr>
            <tr><td>Balconies</td><td>{listing.balcony}</td></tr>
            <tr><td>Floor</td><td>{listing.floor} of {listing.total_floors}</td></tr>
            <tr><td>Furnishing</td><td>{titleCase(listing.furnishing)}</td></tr>
            <tr><td>Facing</td><td>{titleCase(listing.facing_direction)}</td></tr>
            <tr><td>Covered parking</td><td>{listing.covered_parking}</td></tr>
            <tr><td>Posted</td><td>{new Date(listing.posted_at).toLocaleDateString()}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>Contact</h2>
        <p>{listing.posted_by_name} ({titleCase(listing.posted_by)})</p>
        <p>{listing.posted_by_contact}</p>
        <p className="muted">Source: {listing.website} · <a href={listing.listing_url} target="_blank" rel="noreferrer">View original</a></p>
      </div>
    </div>
  );
}
