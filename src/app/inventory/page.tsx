"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Lexend } from "next/font/google";
import {
  deleteInventoryItem,
  getInventory,
  type InventoryItem,
} from "../../lib/inventory-store";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

const filters = [
  "All",
  "Draft",
  "Ready to List",
  "Listed",
  "Sold",
  "Unsold",
  "Removed",
] as const;

type Filter = (typeof filters)[number];

function money(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : `£${value.toFixed(2)}`;
}

function getTitle(item: InventoryItem) {
  return (
    item.listing?.title ||
    (item.product?.item_type as string) ||
    "Untitled item"
  );
}

function getBrand(item: InventoryItem) {
  return (
    (item.product?.brand as string) ||
    "Unknown brand"
  );
}

function getPrice(item: InventoryItem) {
  const selling = item.selling as
    | {
        price?: number | null;
        customPrice?: number | null;
      }
    | undefined;

  return (
    selling?.price ??
    selling?.customPrice ??
    null
  );
}

function getROI(item: InventoryItem) {
  return typeof item.estimatedROI === "number" &&
    Number.isFinite(item.estimatedROI)
    ? item.estimatedROI
    : null;
}

function ListingThumb({ item }: { item: InventoryItem }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f4f4f5] text-3xl text-zinc-300">
      {item.imageCount > 0 ? "📷" : "▧"}
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: InventoryItem["status"];
}) {
  const classes =
    status === "Sold"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Listed"
        ? "bg-blue-50 text-blue-700"
        : status === "Ready to List"
          ? "bg-violet-50 text-violet-700"
          : status === "Removed"
            ? "bg-red-50 text-red-600"
            : "bg-zinc-100 text-zinc-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "violet" | "blue" | "green" | "amber";
}) {
  const classes = {
    violet: "bg-[#eeeafa] text-[#5945c7]",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-[22px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${classes[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  // IMPORTANT:
  // Do not use window.location.pathname during render.
  // usePathname() is the Next.js-safe way to determine the active route.
  const pathname = usePathname();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setItems(getInventory());
  }

  useEffect(() => {
    refresh();

    const handleChange = () => refresh();

    window.addEventListener(
      "reseller-ai-listings-changed",
      handleChange
    );

    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener(
        "reseller-ai-listings-changed",
        handleChange
      );

      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        filter === "All" || item.status === filter;

      const haystack = [
        getTitle(item),
        getBrand(item),
        item.product?.model,
        item.category,
        item.condition,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && haystack.includes(query);
    });
  }, [items, filter, search]);

  const stats = {
    total: items.length,
    inStock: items.filter(
      (item) =>
        item.status !== "Sold" &&
        item.status !== "Removed" &&
        item.quantitySold < item.quantity
    ).length,
    listed: items.filter(
      (item) => item.status === "Listed"
    ).length,
    sold: items.filter(
      (item) => item.status === "Sold"
    ).length,
  };

  async function removeItem(id: string) {
    const item = items.find((entry) => entry.id === id);

    if (!item) return;

    const confirmed = window.confirm(
      `Remove "${getTitle(item)}" completely?\n\nThis removes the saved Inventory item from this browser.`
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      deleteInventoryItem(id);
      refresh();
    } catch (error) {
      console.error("Failed to remove inventory item:", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main
      className={`${lexend.className} min-h-screen bg-[#f4f4f5] pb-24 text-[#20202a] lg:pb-8`}
    >
      <div className="mx-auto min-h-screen max-w-[1800px]">
        <header className="border-b border-zinc-200/70 bg-white">
          <div className="flex min-h-[88px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
            <div>
              <Link
                href="/"
                className="text-xs font-semibold text-[#5b47cc] hover:text-[#4936b5]"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
                Inventory
              </h1>

              <p className="mt-1 text-sm text-zinc-400">
                Keep track of everything you currently own and have
                available to sell.
              </p>
            </div>

            <Link
              href="/add"
              className="inline-flex items-center gap-2 rounded-full bg-[#5540c8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
            >
              <span className="text-lg">＋</span>
              Add Item
            </Link>
          </div>
        </header>

        <div className="p-5 sm:p-8 xl:p-10">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Items"
              value={stats.total}
              icon="▣"
              tone="violet"
            />

            <StatCard
              label="In Stock"
              value={stats.inStock}
              icon="□"
              tone="green"
            />

            <StatCard
              label="Listed"
              value={stats.listed}
              icon="↗"
              tone="blue"
            />

            <StatCard
              label="Sold"
              value={stats.sold}
              icon="£"
              tone="amber"
            />
          </div>

          <section className="mt-5 rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      filter === item
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="relative w-full xl:max-w-sm">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search inventory..."
                  className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#5540c8] focus:bg-white"
                />
              </div>
            </div>
          </section>

          <section className="mt-5">
            {visibleItems.length === 0 ? (
              <div className="rounded-[24px] border border-zinc-200/80 bg-white px-6 py-20 text-center shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eeeafa] text-2xl text-[#5945c7]">
                  ▣
                </div>

                <h2 className="mt-5 text-lg font-semibold">
                  No inventory found
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                  {search || filter !== "All"
                    ? "Try changing your search or filter."
                    : "Analyse and save your first item to see it here."}
                </p>

                {!search && filter === "All" && (
                  <Link
                    href="/add"
                    className="mt-5 inline-flex rounded-full bg-[#5540c8] px-5 py-3 text-sm font-semibold text-white"
                  >
                    ＋ Add Item
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((item) => {
                  const price = getPrice(item);
                  const remaining = Math.max(
                    0,
                    Number(item.quantity || 0) -
                      Number(item.quantitySold || 0)
                  );

                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.025)]"
                    >
                      <div className="aspect-[4/3] bg-zinc-100">
                        <ListingThumb item={item} />
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <StatusPill status={item.status} />

                          <span className="text-xs font-medium text-zinc-400">
                            {remaining} in stock
                          </span>
                        </div>

                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400">
                          {getBrand(item)}
                        </p>

                        <h2 className="mt-1 line-clamp-2 text-lg font-semibold tracking-tight">
                          {getTitle(item)}
                        </h2>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-zinc-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                              Purchase
                            </p>

                            <p className="mt-1 font-semibold">
                              {money(item.purchasePrice)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-zinc-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                              Sale price
                            </p>

                            <p className="mt-1 font-semibold">
                              {money(price)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-start gap-6">
                            <div>
                              <p className="text-xs text-zinc-400">
                                Estimated profit
                              </p>

                              <p className="mt-0.5 font-semibold text-emerald-600">
                                {money(item.estimatedProfit)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-zinc-400">
                                ROI
                              </p>

                              <p className="mt-0.5 font-semibold">
                                {getROI(item) !== null
                                  ? `${getROI(item)!.toFixed(1)}%`
                                  : "—"}
                              </p>
                            </div>
                          </div>

                          <Link
                            href={`/inventory/${item.id}`}
                            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                          >
                            View
                          </Link>
                        </div>

                        <button
                          type="button"
                          onClick={() => void removeItem(item.id)}
                          disabled={deletingId === item.id}
                          className="mt-3 w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === item.id
                            ? "Removing..."
                            : "Remove Item"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {[
            ["⌂", "Home", "/"],
            ["＋", "Add", "/add"],
            ["▣", "Stock", "/inventory"],
            ["◇", "Listings", "/listings"],
            ["£", "Sales", "/sales"],
          ].map(([icon, label, href]) => {
            // IMPORTANT:
            // pathname comes from usePathname(), so there is no
            // window access during render.
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-semibold transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-400 hover:bg-[#f4f4f5]"
                }`}
              >
                <span className="text-lg leading-none">
                  {icon}
                </span>

                <span className="mt-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}