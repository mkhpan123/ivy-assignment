interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  // When provided, this (not totalPages) decides whether "Next" is enabled.
  // totalPages here is display-only text - some collections' reported
  // `total` undercounts what's actually retrievable (see findings:
  // pagination), so we trust the page response's own has_more flag instead
  // of a page-count derived from that total.
  hasNext?: boolean;
}

export function Pagination({ page, totalPages, onChange, hasNext }: Props) {
  if (totalPages <= 1 && hasNext === undefined) return null;
  const nextDisabled = hasNext === undefined ? page >= totalPages : !hasNext;
  return (
    <div className="pagination">
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {page} of {totalPages}
      </span>
      <button className="btn" disabled={nextDisabled} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
