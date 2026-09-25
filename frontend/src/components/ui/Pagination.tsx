import { usePagination } from "../../hooks/usePagination";
import { Button } from "./Button";

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { totalPages, hasPrev, hasNext, startItem, endItem } = usePagination(page, total, pageSize);
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-fd-taupe">
      <span>
        {startItem}-{endItem} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="px-2 py-2">
          Page {page} of {totalPages}
        </span>
        <Button variant="secondary" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
