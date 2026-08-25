"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Account created! Check your email to confirm your account."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 py-10 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-8">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Start using Reseller AI
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">

            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-zinc-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none transition focus:border-[#8d7de0] focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-zinc-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none transition focus:border-[#8d7de0] focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="text-sm font-semibold text-zinc-700"
              >
                Confirm Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none transition focus:border-[#8d7de0] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#5540c8] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

          </form>

          <div className="mt-7 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#5540c8] hover:text-[#4936b5]"
            >
              Sign in
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}