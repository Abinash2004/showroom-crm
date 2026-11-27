import "server-only";

import { cookies } from "next/headers";
import { BRANCH_COOKIE } from "./branch-preference";

/** The branch remembered from the user's last pick on either list, if any. Unvalidated: resolve it with `resolveBranchId`. */
export async function rememberedBranchId(): Promise<string | undefined> {
  return (await cookies()).get(BRANCH_COOKIE)?.value || undefined;
}
