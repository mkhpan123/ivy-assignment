import { Link } from "react-router-dom";
import type { Listing } from "../api/types";
import { formatInr, titleCase } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { isFavourite, toggleFavourite } from "../api/favourites";
import { useState } from "react";

export function ListingCard({
  listing,
  onFavouriteChange,
}: {
  listing: Listing;
  onFavouriteChange?: () => void;
}) {
  const { user } = useAuth();
  const [fav, setFav] = useState(() => (user ? isFavourite(user.email, listing.listing_id) : false));

  function handleToggleFav(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) return;
    toggleFavourite(user.email, listing.listing_id);
    setFav((f) => !f);
    onFavouriteChange?.();
  }

  return (
    <Link to={`/listings/${listing.listing_id}`} className="card">
      <button
        className={`fav-btn ${fav ? "active" : ""}`}
        onClick={handleToggleFav}
        aria-label={fav ? "Remove from saved" : "Save listing"}
        title={fav ? "Remove from saved" : "Save listing"}
      >
        {fav ? "♥" : "♡"}
      </button>
      <div className="card-title">
        {listing.bedroom} BHK {titleCase(listing.property_type)}
      </div>
      <div className="card-locality">{listing.apartment_name} · {titleCase(listing.locality)}</div>
      <div className="card-price">{formatInr(listing.price)}</div>
      <div className="card-meta">
        <span>{listing.carpet_area} sqft</span>
        <span>{listing.bathroom} bath</span>
        <span>Floor {listing.floor}/{listing.total_floors}</span>
        <span>{titleCase(listing.furnishing)}</span>
      </div>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {listing.is_verified && <span className="badge badge-verified">Verified</span>}
        {!listing.is_live && <span className="badge badge-inactive">Inactive</span>}
      </div>
    </Link>
  );
}
