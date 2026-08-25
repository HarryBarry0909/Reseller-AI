"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 py-10 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-8">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Reseller AI
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Sign in to your reseller dashboard
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">

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
                placeholder="Your password"
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm outline-none transition focus:border-[#8d7de0] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#5540c8] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <div className="mt-7 text-center text-sm text-zinc-400">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[#5540c8] hover:text-[#4936b5]"
            >
              Create one
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}