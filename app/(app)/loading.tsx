import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Skeleton className="h-8 flex-1 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-4">
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-11 w-2/3 rounded-full" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}