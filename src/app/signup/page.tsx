"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f5ef] px-4 text-[#1f2933]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Visual AI Whiteboard</p>
        </div>

        <form
          className="rounded-md border border-[#d8d2c3] bg-[#fffdfa] p-6"
          onSubmit={handleSubmit}
        >
          {error ? (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                autoComplete="name"
                className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                type="text"
                value={name}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                value={email}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="password"
              >
                Password
                <span className="ml-1 font-normal text-[#6b7280]">
                  (8+ chars)
                </span>
              </label>
              <input
                autoComplete="new-password"
                className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                id="password"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
            </div>

            <button
              className="min-h-11 w-full rounded-md bg-[#2f5d50] text-sm font-semibold text-white disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-[#6b7280]">
          Already have an account?{" "}
          <Link className="font-semibold text-[#2f5d50]" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
