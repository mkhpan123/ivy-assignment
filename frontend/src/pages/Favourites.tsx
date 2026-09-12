import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { Listing } from "../api/types";
import { ListingCard } from "../components/ListingCard";
import { useAuth } from "../context/AuthContext";
import { getFavouriteIds } from "../api/favourites";

export function Favourites() {
  const { user } = useAuth();
  const [refreshTick, setRefreshTick] = useState(0);
  const ids = user ? getFavouriteIds(user.email) : [];
  void refreshTick;

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["listing", id],
      queryFn: () => apiFetch<Listing>(`/v1/listings/${id}`),
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const listings = results.map((r) => r.data).filter((d): d is Listing => !!d);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Saved listings</h1>
        <span className="muted">{ids.length} saved</span>
      </div>

      {ids.length === 0 && (
        <div className="empty-state">
          Nothing saved yet. Tap the heart on any listing to save it here.
        </div>
      )}

      {loading && ids.length > 0 && <div className="loading">Loading saved listings…</div>}

      <div className="card-grid">
        {listings.map((l) => (
          <ListingCard key={l.listing_id} listing={l} onFavouriteChange={() => setRefreshTick((t) => t + 1)} />
        ))}
      </div>
    </div>
  );
}
