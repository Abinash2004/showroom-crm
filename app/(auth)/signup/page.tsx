import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/forms/signup-form";
import { getActor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Complete sign-up" };

export default async function SignupPage() {
  if (await getActor()) redirect("/leads");
  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-bold tracking-tight">Complete sign-up</h1>
      <p className="mb-5 text-sm text-muted">Use the phone number and employee code your administrator registered for you.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already signed up?{" "}
        <Link href="/login" className="font-semibold text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-fg">
          Sign in
        </Link>
      </p>
    </>
  );
}