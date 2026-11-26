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
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 rounded-full bg-surface-2 p-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonClass("ghost", "bg-surface hover:bg-white")} rel="prev">
          Previous
        </Link>
      ) : (
        <span className="min-h-12 min-w-24" />
      )}
      <span className="font-mono text-sm tabular-nums text-muted" aria-live="polite">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={buttonClass("ink")} rel="next">
          Next
        </Link>
      ) : (
        <span className="min-h-12 min-w-24" />
      )}
    </nav>
  );
}
