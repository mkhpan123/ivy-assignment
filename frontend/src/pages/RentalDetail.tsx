import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import type { Rental } from "../api/types";
import { formatInr, titleCase } from "../utils/format";
import { trueDeposit } from "../utils/rentalDeposit";

export function RentalDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: rental, isLoading, error } = useQuery({
    queryKey: ["rental", id],
    queryFn: () => apiFetch<Rental>(`/v1/rentals/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="error-banner">{(error as Error).message}</div></div>;
  if (!rental) return null;

  return (
    <div className="page">
      <Link to="/rentals" className="muted">← Back to rentals</Link>
      <div className="section" style={{ marginTop: "1rem" }}>
        <h1>{rental.bedroom} BHK {titleCase(rental.property_type)} in {rental.apartment_name}</h1>
        <p className="muted" style={{ textTransform: "capitalize" }}>{rental.locality}</p>
        <div className="card-price" style={{ fontSize: "1.6rem", margin: "0.5rem 0" }}>
          {formatInr(rental.price)}/mo
        </div>
        <p>{rental.description}</p>
      </div>

      <div className="section">
        <h2>Details</h2>
        <table>
          <tbody>
            <tr><td>Deposit</td><td>{formatInr(trueDeposit(rental))}</td></tr>
            <tr><td>Maintenance</td><td>{formatInr(rental.maintenance)}/mo</td></tr>
            <tr><td>Carpet area</td><td>{rental.carpet_area} sqft</td></tr>
            <tr><td>Super built-up area</td><td>{rental.super_builtup_area} sqft</td></tr>
            <tr><td>Bathrooms</td><td>{rental.bathroom}</td></tr>
            <tr><td>Floor</td><td>{rental.floor} of {rental.total_floors}</td></tr>
            <tr><td>Furnishing</td><td>{titleCase(rental.furnishing)}</td></tr>
            <tr><td>Facing</td><td>{titleCase(rental.facing_direction)}</td></tr>
            <tr><td>Posted</td><td>{new Date(rental.posted_at).toLocaleDateString()}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>Contact</h2>
        <p>{rental.posted_by_name} ({titleCase(rental.posted_by)})</p>
        <p>{rental.posted_by_contact}</p>
        <p className="muted">Source: {rental.website} · <a href={rental.listing_url} target="_blank" rel="noreferrer">View original</a></p>
      </div>
    </div>
  );
}
