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
      <h1 className="mb-1 text-2xl font-semibold">Complete sign-up</h1>
      <p className="mb-4 text-sm text-muted">Use the phone number and employee code your administrator registered for you.</p>
      <SignupForm />
      <p className="mt-5 text-sm text-muted">
        Already signed up?{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}