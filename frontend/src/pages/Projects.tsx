import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePagedRecords } from "../hooks/usePagedRecords";
import type { Project } from "../api/types";
import { Pagination } from "../components/Pagination";
import { formatInr, titleCase } from "../utils/format";
import { projectPriceRange } from "../utils/projectPrice";

const PAGE_SIZE = 24;

export function Projects() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ project_status: status || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    [status, page]
  );
  const { data, isLoading, error } = usePagedRecords<Project>("/v1/projects", params);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects in Bangalore</h1>
        {data && <span className="muted">{data.total.toLocaleString()} projects found</span>}
      </div>

      <div className="filter-bar">
        <label>
          Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Any</option>
            <option value="under construction">Under construction</option>
            <option value="ready to move">Ready to move</option>
            <option value="new launch">New launch</option>
          </select>
        </label>
      </div>

      {error && <div className="error-banner">{(error as Error).message}</div>}
      {isLoading && <div className="loading">Loading projects…</div>}
      {!isLoading && (data?.results.length ?? 0) === 0 && <div className="empty-state">No projects match these filters.</div>}

      <div className="card-grid">
        {(data?.results ?? []).map((p) => {
          const { min, max } = projectPriceRange(p);
          return (
            <Link key={p.project_id} to={`/projects/${p.project_id}`} className="card">
              <div className="card-title">{p.apartment_name}</div>
              <div className="card-locality">{p.developer_name} · {titleCase(p.locality)}</div>
              <div className="card-price">{formatInr(min)} - {formatInr(max)}</div>
              <div className="card-meta">
                <span>{titleCase(p.project_status)}</span>
                <span>{p.total_units} units</span>
                <span>{p.min_area_sqft}-{p.max_area_sqft} sqft</span>
              </div>
            </Link>
          );
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} hasNext={data?.has_more} />
    </div>
  );
}
