import { cn } from "@/lib/cn";

/** Content column shared by all pages: 360px-first, widens on tablet/desktop. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-3xl space-y-4 px-4 py-4", className)}>{children}</main>;
}