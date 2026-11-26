import Link from "next/link";
import { buttonClass } from "./button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ page, pageSize, total, hrefFor }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClass("outline")} rel="prev">
          Previous
        </Link>
      ) : (
        <span className="min-h-12 min-w-12" />
      )}
      <span className="text-sm text-muted" aria-live="polite">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={buttonClass("outline")} rel="next">
          Next
        </Link>
      ) : (
        <span className="min-h-12 min-w-12" />
      )}
    </nav>
  );
}