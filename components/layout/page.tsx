import { cn } from "@/lib/cn";

/**
 * Content column shared by all pages: phone-first, widens on desktop.
 * `wide` is for list workspaces (2-column cards); forms and detail sheets stay narrower.
 */
export function PageBody({ children, className, wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <main className={cn("mx-auto w-full space-y-4 px-4 py-4", wide ? "max-w-5xl" : "max-w-3xl", className)}>{children}</main>;
}
