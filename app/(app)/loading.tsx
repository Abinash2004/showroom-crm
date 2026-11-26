import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="h-14 border-b border-line bg-surface" />
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-10 w-2/3" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}