"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="pt-12">
      <div className="w-full max-w-sm mx-auto animate-fade-in-up">
        <div className="bg-surface border border-primary/20 rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div className="text-center mb-4 text-4xl">✉️</div>
          <h1 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
            Check Your Email
          </h1>
          <p className="text-text-muted text-center text-sm mb-2">
            We&apos;ve sent a confirmation link to
          </p>
          {email && (
            <p className="text-text text-center font-semibold mb-4">{email}</p>
          )}
          <p className="text-text-muted text-center text-sm mb-6">
            Please click the link in your email to verify your account before
            signing in.
          </p>
          <Link
            href="/login"
            className="block w-full py-2.5 bg-primary hover:bg-primary-light text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 text-center"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
