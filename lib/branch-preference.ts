/**
 * The branch picked on Leads or Follow-ups is remembered for the rest of the visit, so both lists
 * stay on the same branch. It is a plain session cookie (no expiry: gone when the browser or installed
 * app is closed). It is only a hint: the pages accept it solely when it is one of the signed-in user's
 * own branches, so it can't widen access.
 */
export const BRANCH_COOKIE = "showroom_branch";

/** Browser only. Call when the user picks a branch. */
export function rememberBranch(branchId: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${BRANCH_COOKIE}=${encodeURIComponent(branchId)}; Path=/; SameSite=Lax${secure}`;
}
