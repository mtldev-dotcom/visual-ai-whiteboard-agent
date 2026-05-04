"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function AuthCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-app)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
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
              {title}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-3)" }}>
              {subtitle}
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
          {children}
        </div>
      </div>
    </main>
  );
}

function InputField({
  id,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        className="mb-1.5 flex items-center justify-between text-xs font-medium"
        htmlFor={id}
      >
        <span style={{ color: "var(--text-1)" }}>{label}</span>
        {hint && (
          <span className="font-normal" style={{ color: "var(--text-3)" }}>
            {hint}
          </span>
        )}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors"
        id={id}
        style={{
          background: "var(--bg-app)",
          borderColor: "var(--border)",
          color: "var(--text-1)",
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        }}
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard subtitle="Visual AI Whiteboard" title="Welcome back">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error && (
          <div
            className="rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: "var(--danger-light)",
              color: "var(--danger)",
            }}
          >
            {error}
          </div>
        )}

        <InputField
          autoComplete="email"
          id="email"
          label="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          value={email}
        />
        <InputField
          autoComplete="current-password"
          id="password"
          label="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
          type="password"
          value={password}
        />

        <button
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
          disabled={loading}
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg)",
            marginTop: "4px",
          }}
          type="submit"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p
        className="mt-5 text-center text-xs"
        style={{ color: "var(--text-3)" }}
      >
        No account?{" "}
        <Link
          className="font-semibold"
          href="/signup"
          style={{ color: "var(--accent)" }}
        >
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
