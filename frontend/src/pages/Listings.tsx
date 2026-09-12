import { useMemo, useState } from "react";
import { usePagedRecords } from "../hooks/usePagedRecords";
import type { Listing } from "../api/types";
import { ListingCard } from "../components/ListingCard";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 24;
const LOCALITIES = [
  "koramangala", "indiranagar", "whitefield", "hsr layout", "jp nagar", "bellandur",
  "sarjapur road", "electronic city", "hebbal", "yelahanka", "marathahalli",
];

type SortKey = "price" | "carpet_area" | "posted_at" | "bedroom";

export function Listings() {
  const [locality, setLocality] = useState("");
  const [bhk, setBhk] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("posted_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      locality: locality || undefined,
      bhk: bhk || undefined,
      property_type: propertyType || undefined,
      min_price: minPrice || undefined,
      max_price: maxPrice || undefined,
      furnishing: furnishing || undefined,
      sort_by: sortKey,
      order: sortOrder,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [locality, bhk, propertyType, minPrice, maxPrice, furnishing, sortKey, sortOrder, page]
  );

  const { data, isLoading, error } = usePagedRecords<Listing>("/v1/listings", params);

  // The API's `order` param is ignored server-side, so it always comes back
  // ascending by sort_by - reverse this page's results to honor "desc".
  const items = useMemo(() => {
    if (!data) return [];
    return sortOrder === "desc" ? [...data.results].reverse() : data.results;
  }, [data, sortOrder]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function updateFilter(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Buy in Bangalore</h1>
        {data && <span className="muted">{data.total.toLocaleString()} listings found</span>}
      </div>

      <div className="filter-bar">
        <label>
          Locality
          <select value={locality} onChange={(e) => updateFilter(setLocality)(e.target.value)}>
            <option value="">Any</option>
            {LOCALITIES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Bedrooms
          <select value={bhk} onChange={(e) => updateFilter(setBhk)(e.target.value)}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} BHK</option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={propertyType} onChange={(e) => updateFilter(setPropertyType)(e.target.value)}>
            <option value="">Any</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="independent house">Independent House</option>
            <option value="builder floor">Builder Floor</option>
            <option value="plot">Plot</option>
          </select>
        </label>
        <label>
          Min price
          <input type="number" placeholder="₹" value={minPrice} onChange={(e) => updateFilter(setMinPrice)(e.target.value)} />
        </label>
        <label>
          Max price
          <input type="number" placeholder="₹" value={maxPrice} onChange={(e) => updateFilter(setMaxPrice)(e.target.value)} />
        </label>
        <label>
          Furnishing
          <select value={furnishing} onChange={(e) => updateFilter(setFurnishing)(e.target.value)}>
            <option value="">Any</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="fully-furnished">Fully-furnished</option>
          </select>
        </label>
        <label>
          Sort by
          <select value={sortKey} onChange={(e) => { setSortKey(e.target.value as SortKey); setPage(1); }}>
            <option value="posted_at">Newest</option>
            <option value="price">Price</option>
            <option value="carpet_area">Area</option>
            <option value="bedroom">Bedrooms</option>
          </select>
        </label>
        <label>
          Order
          <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setPage(1); }}>
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
        </label>
      </div>

      {error && <div className="error-banner">{(error as Error).message}</div>}
      {isLoading && <div className="loading">Loading listings…</div>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state">No listings match these filters.</div>
      )}

      <div className="card-grid">
        {items.map((l) => (
          <ListingCard key={l.listing_id} listing={l} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} hasNext={data?.has_more} />
    </div>
  );
}
