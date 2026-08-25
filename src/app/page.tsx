"use client";

import { useEffect, useState } from "react";
import { Lexend } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const lexend = Lexend({ subsets: ["latin"] });

type UserInfo = {
  name: string;
  email: string;
  avatar: string | null;
};

export default function Home() {
  const nav = [
    ["⌂", "Home", "/"],
    ["＋", "Add", "/add"],
    ["▣", "Stock", "/inventory"],
    ["◇", "Listings", "/listings"],
    ["£", "Sales", "/sales"],
  ];

  const stats = [
    ["Revenue", "£0.00", "Total sales revenue"],
    ["Profit", "£0.00", "Total estimated profit"],
    ["Items Listed", "0", "Currently listed items"],
    ["Items Sold", "0", "Total items sold"],
  ];

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        setLoadingUser(false);
        return;
      }

      const metadata = user.user_metadata ?? {};

      const name =
        metadata.full_name ||
        metadata.name ||
        metadata.user_name ||
        user.email?.split("@")[0] ||
        "User";

      const avatar =
        metadata.avatar_url ||
        metadata.picture ||
        null;

      setUser({
        name,
        email: user.email || "",
        avatar,
      });

      setLoadingUser(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div
      className={`${lexend.className} min-h-screen bg-zinc-100 text-zinc-900`}
    >
      <div className="flex min-h-screen">
        {/* =====================================================
            DESKTOP SIDEBAR
        ===================================================== */}

        <aside className="hidden w-64 border-r border-zinc-200 bg-white p-5 lg:block">
          <div className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight">
              Reseller AI
            </h1>

            <p className="mt-1 text-sm text-zinc-400">
              Version 0.1.1
            </p>
          </div>

          <nav className="space-y-2">
            {[
              ["Dashboard", "/"],
              ["Add Item", "/add"],
              ["Inventory", "/inventory"],
              ["Listings", "/listings"],
              ["Sales", "/sales"],
              ["Settings", "/settings"],
            ].map(([label, href], index) => (
              <a
                key={href}
                href={href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                  index === 0
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* =====================================================
            MAIN
        ===================================================== */}

        <main className="flex-1 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="mb-6 flex items-center justify-between gap-4 lg:mb-8">

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                  Reseller AI
                </p>

                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Dashboard
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Welcome back
                  {user?.name ? `, ${user.name}` : ""}.
                </p>
              </div>

              {/* =================================================
                  ACCOUNT
              ================================================= */}

              <div className="flex items-center gap-2 sm:gap-3">

                {/* Add button */}

                <a
                  href="/add"
                  className="rounded-full bg-[#5540c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5] sm:px-5 sm:py-3"
                >
                  <span className="sm:hidden">
                    + Add
                  </span>

                  <span className="hidden sm:inline">
                    + Add Item
                  </span>
                </a>

                {/* Account */}

                <a
                  href="/settings"
                  title="Account settings"
                  className="group flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 sm:gap-3 sm:pr-3"
                >

                  {/* Avatar */}

                  {loadingUser ? (
                    <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 sm:h-10 sm:w-10" />
                  ) : user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-white sm:h-10 sm:w-10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5540c8] text-xs font-bold text-white sm:h-10 sm:w-10">
                      {getInitials(user?.name || "User")}
                    </div>
                  )}

                  {/* User details */}

                  <div className="hidden max-w-[150px] text-left sm:block">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {loadingUser
                        ? "Loading..."
                        : user?.name || "User"}
                    </p>

                    <p className="truncate text-[10px] text-zinc-400">
                      {loadingUser
                        ? ""
                        : user?.email || ""}
                    </p>
                  </div>

                  {/* Chevron */}

                  <span className="hidden text-xs text-zinc-400 transition group-hover:text-zinc-700 sm:inline">
                    ▼
                  </span>
                </a>
              </div>
            </div>

            {/* =================================================
                STATS
            ================================================= */}

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {stats.map(([label, value, sub]) => (
                <div
                  key={label}
                  className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-2xl sm:p-6"
                >
                  <p className="text-xs font-medium text-zinc-400 sm:text-sm">
                    {label}
                  </p>

                  <p className="mt-1.5 text-2xl font-bold tracking-tight sm:mt-2 sm:text-3xl">
                    {value}
                  </p>

                  <p className="mt-1 text-[10px] text-zinc-400 sm:mt-2 sm:text-xs">
                    {sub}
                  </p>
                </div>
              ))}
            </div>

            {/* =================================================
                MAIN CARDS
            ================================================= */}

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:mt-8 lg:gap-5">

              <div className="rounded-[20px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-2xl sm:p-6">
                <h3 className="text-base font-semibold sm:text-lg">
                  Add your first item
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Upload photos and let Reseller AI analyse the item,
                  generate a listing and recommend a selling price.
                </p>

                <a
                  href="/add"
                  className="mt-5 inline-flex rounded-full bg-[#5540c8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4936b5]"
                >
                  + Add Item
                </a>
              </div>

              <div className="rounded-[20px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-2xl sm:p-6">
                <h3 className="text-base font-semibold sm:text-lg">
                  Reseller AI
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Your hub for inventory, listings, sales, profit tracking
                  and AI-powered resale tools.
                </p>

                <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Current Version
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    0.1.1
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    Private beta development
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                RECENT ACTIVITY
            ================================================= */}

            <div className="mt-5 rounded-[20px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:mt-8 sm:rounded-2xl sm:p-6">
              <h3 className="text-base font-semibold sm:text-lg">
                Recent Activity
              </h3>

              <p className="mt-1 text-sm text-zinc-400">
                Your latest listings and sales will appear here.
              </p>

              <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-7 text-center sm:mt-6 sm:p-10">
                <p className="text-sm font-medium text-zinc-500">
                  No activity yet
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  Add your first item to get started.
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* =====================================================
          MOBILE NAVIGATION
      ===================================================== */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {nav.map(([icon, label, href], index) => (
            <a
              key={href}
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-semibold ${
                index === 0
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-400"
              }`}
            >
              <span className="text-lg leading-none">
                {icon}
              </span>

              <span className="mt-1">
                {label}
              </span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}