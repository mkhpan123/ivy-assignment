import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePagedRecords } from "../hooks/usePagedRecords";
import type { Rental } from "../api/types";
import { Pagination } from "../components/Pagination";
import { formatInr, titleCase } from "../utils/format";
import { trueDeposit } from "../utils/rentalDeposit";

const PAGE_SIZE = 24;
const LOCALITIES = [
  "koramangala", "indiranagar", "whitefield", "hsr layout", "jp nagar", "bellandur",
  "sarjapur road", "electronic city", "hebbal", "yelahanka", "marathahalli",
];

export function Rentals() {
  const [locality, setLocality] = useState("");
  const [bhk, setBhk] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      locality: locality || undefined,
      bhk: bhk || undefined,
      furnishing: furnishing || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [locality, bhk, furnishing, page]
  );

  const { data, isLoading, error } = usePagedRecords<Rental>("/v1/rentals", params);
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
        <h1>Rent in Bangalore</h1>
        {data && <span className="muted">{data.total.toLocaleString()} rentals found</span>}
      </div>

      <div className="filter-bar">
        <label>
          Locality
          <select value={locality} onChange={(e) => updateFilter(setLocality)(e.target.value)}>
            <option value="">Any</option>
            {LOCALITIES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>
          Bedrooms
          <select value={bhk} onChange={(e) => updateFilter(setBhk)(e.target.value)}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} BHK</option>)}
          </select>
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
      </div>

      {error && <div className="error-banner">{(error as Error).message}</div>}
      {isLoading && <div className="loading">Loading rentals…</div>}
      {!isLoading && (data?.results.length ?? 0) === 0 && <div className="empty-state">No rentals match these filters.</div>}

      <div className="card-grid">
        {(data?.results ?? []).map((r) => (
          <Link key={r.listing_id} to={`/rentals/${r.listing_id}`} className="card">
            <div className="card-title">{r.bedroom} BHK {titleCase(r.property_type)}</div>
            <div className="card-locality">{r.apartment_name} · {titleCase(r.locality)}</div>
            <div className="card-price">{formatInr(r.price)}/mo</div>
            <div className="card-meta">
              <span>Deposit {formatInr(trueDeposit(r))}</span>
              <span>{r.carpet_area} sqft</span>
              <span>{titleCase(r.furnishing)}</span>
            </div>
          </Link>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} hasNext={data?.has_more} />
    </div>
  );
}
