import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, fetchAllPages } from "../api/client";
import type { Listing, Project } from "../api/types";
import { formatInr, titleCase } from "../utils/format";
import { projectPriceRange } from "../utils/projectPrice";
import { ListingCard } from "../components/ListingCard";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiFetch<Project>(`/v1/projects/${id}`),
    enabled: !!id,
  });

  // The `project_id` filter on /v1/listings is silently ignored server-side
  // (confirmed: it returns the same unfiltered page regardless of value),
  // so matching listings are found by fetching everything and filtering
  // here instead.
  const { data: allListings } = useQuery({
    queryKey: ["listings-for-project-filter"],
    queryFn: () => fetchAllPages<Listing>("/v1/listings"),
    staleTime: 5 * 60 * 1000,
  });
  const projectListings = (allListings ?? []).filter((l) => l.project_id === id);

  if (isLoading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="error-banner">{(error as Error).message}</div></div>;
  if (!project) return null;

  const { min, max } = projectPriceRange(project);

  return (
    <div className="page">
      <Link to="/projects" className="muted">← Back to projects</Link>
      <div className="section" style={{ marginTop: "1rem" }}>
        <h1>{project.apartment_name}</h1>
        <p className="muted">{project.developer_name} · {titleCase(project.locality)}</p>
        <div className="card-price" style={{ fontSize: "1.4rem", margin: "0.5rem 0" }}>
          {formatInr(min)} - {formatInr(max)}
        </div>
        <span className="badge">{titleCase(project.project_status)}</span>
      </div>

      <div className="section">
        <h2>Project details</h2>
        <table>
          <tbody>
            <tr><td>Total units</td><td>{project.total_units}</td></tr>
            <tr><td>Towers</td><td>{project.total_towers}</td></tr>
            <tr><td>Floors</td><td>{project.total_floors}</td></tr>
            <tr><td>Area range</td><td>{project.min_area_sqft} - {project.max_area_sqft} sqft</td></tr>
            <tr><td>Launch date</td><td>{project.launch_date}</td></tr>
            <tr><td>Possession date</td><td>{project.possession_date}</td></tr>
            <tr><td>RERA</td><td>{project.rera_number}</td></tr>
            <tr>
              <td>Listed as having</td>
              <td>{project.total_listings} listings</td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: "0.75rem" }}>Amenities: {project.amenities.join(", ")}</p>
      </div>

      <div className="section">
        <h2>Available listings ({projectListings.length})</h2>
        {projectListings.length === 0 && <p className="muted">No matching listings currently retrievable.</p>}
        <div className="card-grid">
          {projectListings.map((l) => (
            <ListingCard key={l.listing_id} listing={l} />
          ))}
        </div>
      </div>
    </div>
  );
}
