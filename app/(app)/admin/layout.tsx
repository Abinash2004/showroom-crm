import { requireAdminPage } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return children;
}