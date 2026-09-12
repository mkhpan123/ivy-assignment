import { useQuery } from "@tanstack/react-query";
import { fetchPage } from "../api/client";

// Server-side pagination via limit/offset (the shape the API actually
// returns - see api/client.ts). The server also silently caps `limit` at
// 50 regardless of what's requested, despite docs claiming a 200 max.
//
// Sorting is requested via `sort_by`, but the server ignores `order`
// entirely (confirmed: asc and desc return identical, always-ascending
// results) - so for "high to low" style sorts we just reverse the page
// we got back. That's a per-page reversal, not a true global sort across
// the whole filtered set, but doing a real one would mean pulling every
// matching record before showing anything, which is what this hook
// deliberately avoids for browsing speed.
export function usePagedRecords<T>(
  path: string,
  params: Record<string, string | number | undefined>
) {
  return useQuery({
    queryKey: [path, "paged", params],
    queryFn: () => fetchPage<T>(path, params),
    staleTime: 60 * 1000,
  });
}
