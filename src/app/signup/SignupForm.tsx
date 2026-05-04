"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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

export function SignupForm() {
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
        autoComplete="name"
        id="name"
        label="Name"
        hint="Optional"
        onChange={(e) => setName(e.target.value)}
        placeholder=""
        type="text"
        value={name}
      />
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
        autoComplete="new-password"
        id="password"
        label="Password"
        hint="8+ characters"
        minLength={8}
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
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-xs" style={{ color: "var(--text-3)" }}>
        Already have an account?{" "}
        <Link
          className="font-semibold"
          href="/login"
          style={{ color: "var(--accent)" }}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
