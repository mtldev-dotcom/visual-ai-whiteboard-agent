import Link from "next/link";

import { isSignupEnabled } from "@/lib/signup";

import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const signupEnabled = isSignupEnabled();

  return (
    <main
      className="flex min-h-dvh items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-app)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            W
          </div>
          <div className="text-center">
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              {signupEnabled ? "Create account" : "Signup disabled"}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
              Visual AI Whiteboard
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {signupEnabled ? (
            <SignupForm />
          ) : (
            <div className="flex flex-col gap-4">
              <p
                className="text-sm leading-6"
                style={{ color: "var(--text-2)" }}
              >
                New account creation is currently disabled for this deployment.
              </p>
              <Link
                className="w-full rounded-xl py-2.5 text-center text-sm font-semibold"
                href="/login"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
