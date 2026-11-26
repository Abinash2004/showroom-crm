"use client";

import { createContext, useContext } from "react";

/** Display-only details of the signed-in user, taken from the already-verified session in the app layout. */
export interface Viewer {
  name: string;
  isAdmin: boolean;
  branchCount: number;
}

const ViewerContext = createContext<Viewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer(): Viewer {
  const v = useContext(ViewerContext);
  if (!v) throw new Error("useViewer must be used inside the app layout");
  return v;
}

export function roleLine(v: Viewer): string {
  if (v.isAdmin) return "Admin · All branches";
  return `Sales · ${v.branchCount} ${v.branchCount === 1 ? "branch" : "branches"}`;
}
