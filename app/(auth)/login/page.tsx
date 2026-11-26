import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { getActor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  if (await getActor()) redirect("/leads");
  const { registered } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>
      {registered ? (
        <p role="status" className="mb-4 rounded-xl bg-success-soft p-4 text-sm font-medium text-on-success-soft">
          Account created. Sign in with your phone number and password.
        </p>
      ) : null}
      <LoginForm />
      <p className="mt-5 text-sm text-muted">
        First time here?{" "}
        <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
          Complete sign-up
        </Link>
      </p>
    </>
  );
}