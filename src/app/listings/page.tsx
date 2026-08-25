"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Lexend } from "next/font/google";
import {
  deleteListing,
  getImageSet,
  getListings,
  type ListingRecord,
} from "../../lib/listing-store";
import { createClient } from "@/lib/supabase/client";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

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
  return value == null || !Number.isFinite(value) ? "—" : `£${value.toFixed(2)}`;
}

function ListingThumb({ item }: { item: ListingRecord }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    let objectUrl = "";

    (async () => {
      if (!item.imageSetId) return;
      const blobs = await getImageSet(item.imageSetId, item.imageCount);
      if (!alive || !blobs[0]) return;
      objectUrl = URL.createObjectURL(blobs[0]);
      setSrc(objectUrl);
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.imageSetId, item.imageCount]);

  return src ? (
    <img src={src} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[#f4f4f5] text-2xl text-zinc-300">
      ▧
    </div>
  );
}

function StatusPill({ status }: { status: ListingRecord["status"] }) {
  const classes =
    status === "Sold"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Listed"
      ? "bg-blue-50 text-blue-700"
      : status === "Ready to List"
      ? "bg-violet-50 text-violet-700"
      : status === "Removed"
      ? "bg-red-50 text-red-600"
      : "bg-[#f4f4f5] text-zinc-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}>
      {status}
    </span>
  );
}

export default function ListingsPage() {
  const pathname = usePathname();
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingCloud, setLoadingCloud] = useState(true);
  const [cloudError, setCloudError] = useState("");

  const refresh = async () => {
    setLoadingCloud(true);
    setCloudError("");

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Supabase auth error:", userError);
      setListings([]);
      setCloudError(`Account session error: ${userError.message}`);
      setLoadingCloud(false);
      return;
    }

    if (!user) {
      setListings([]);
      setCloudError("You are not logged in on this device.");
      setLoadingCloud(false);
      return;
    }

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load listings from Supabase:", error);
      setListings([]);
      setCloudError(`Could not load your cloud listings: ${error.message}`);
      setLoadingCloud(false);
      return;
    }

    const cloudListings: ListingRecord[] = (data ?? []).map((row: any) => {
      const product = row.product && typeof row.product === "object"
        ? row.product
        : {};
      const itemSpecifics = row.item_specifics && typeof row.item_specifics === "object"
        ? row.item_specifics
        : {};

      return {
        id: String(row.id),
        updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
        status: row.status ?? "Draft",
        soldPrice: row.sold_price ?? null,
        soldAt: row.sold_at ?? null,
        quantity: Number(row.quantity ?? 1),
        quantitySold: Number(row.quantity_sold ?? 0),
        imageSetId: row.image_set_id ?? null,
        imageCount: Number(row.image_count ?? 0),

        listing: {
          title: row.title ?? "Untitled listing",
          description: row.description ?? "",
        },

        product,
        itemSpecifics,

        category: row.category ?? "",
        condition: row.condition ?? "Used",
        marketplace: row.marketplace ?? "eBay",

        selling:
          row.selling && typeof row.selling === "object"
            ? row.selling
            : {
                price: Number(row.price ?? 0),
              },

        shipping:
          row.shipping && typeof row.shipping === "object"
            ? row.shipping
            : {},

        purchasePrice: Number(row.purchase_price ?? 0),
        estimatedProfit: Number(row.estimated_profit ?? 0),
        estimatedROI:
          Number(row.purchase_price ?? 0) > 0
            ? (Number(row.estimated_profit ?? 0) / Number(row.purchase_price ?? 0)) * 100
            : 0,
      } as ListingRecord;
    });

    setListings(cloudListings);
    setLoadingCloud(false);
  };

  useEffect(() => {
    void refresh();

    const handler = () => void refresh();
    window.addEventListener("reseller-ai-listings-changed", handler);
    window.addEventListener("storage", handler);

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      window.removeEventListener("reseller-ai-listings-changed", handler);
      window.removeEventListener("storage", handler);
      subscription.unsubscribe();
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter((item) => {
      const matchesFilter = filter === "All" || item.status === filter;
      const haystack = [
        item.listing.title,
        item.product?.brand,
        item.product?.model,
        item.category,
        item.condition,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && haystack.includes(query);
    });
  }, [listings, filter, search]);

  const stats = {
    total: listings.length,
    listed: listings.filter((x) => x.status === "Listed").length,
    sold: listings.filter((x) => x.status === "Sold").length,
    drafts: listings.filter(
      (x) => x.status === "Draft" || x.status === "Ready to List"
    ).length,
  };

  const removeListing = async (id: string) => {
    const item = listings.find((x) => x.id === id);
    if (!item) return;

    const confirmed = window.confirm(
      `Remove "${item.listing.title}" completely?\n\nThis will delete the saved listing and its stored images from this browser.`
    );

    if (!confirmed) return;

    setDeletingId(id);
    deleteListing(id);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to delete cloud listing:", error);
      }
    }

    await refresh();
    setDeletingId(null);
  };

  return (
    <main className={`${lexend.className} min-h-screen pb-24 lg:pb-8 bg-[#f4f4f5] text-[#20202a]`}>
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
                Listings
              </h1>
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
          <div className="mb-6">
            <p className="text-sm text-zinc-400">
              Manage everything you've analysed, saved and prepared for sale.
            </p>
          </div>

          {loadingCloud && (
            <div className="mb-5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500">
              Loading your cloud listings...
            </div>
          )}

          {!loadingCloud && cloudError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <p className="font-semibold">Cloud listings could not be loaded</p>
              <p className="mt-1">{cloudError}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Listings" value={stats.total} icon="▤" tone="violet" />
            <StatCard label="Active" value={stats.listed} icon="↗" tone="blue" />
            <StatCard label="Sold" value={stats.sold} icon="£" tone="green" />
            <StatCard label="Drafts" value={stats.drafts} icon="○" tone="amber" />
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
                        ? "bg-[#5540c8] text-white shadow-sm"
                        : "bg-[#f4f4f5] text-zinc-500 hover:bg-zinc-200"
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
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search listings..."
                  className="h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#8d7de0] focus:bg-white"
                />
              </div>
            </div>
          </section>

          <div className="mt-5 space-y-3">
            {visible.map((item) => {
              const available = Math.max(
                0,
                Number(item.quantity || 0) - Number(item.quantitySold || 0)
              );
              const price = Number(
                item.selling?.price ?? item.selling?.customPrice ?? 0
              );

              return (
                <div
                  key={item.id}
                  className="group rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <Link
                      href={`/listings/${item.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#f4f4f5] sm:h-28 sm:w-28">
                        <ListingThumb item={item} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold sm:text-lg">
                            {item.listing.title}
                          </h2>
                          <StatusPill status={item.status} />
                        </div>

                        <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                          {item.product?.brand || "Unknown brand"} ·{" "}
                          {item.category || item.product?.item_type || "Other"} ·{" "}
                          {item.condition || "Condition not set"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
                          <span>
                            Qty{" "}
                            <strong className="text-zinc-700">
                              {item.quantity}
                            </strong>
                          </span>
                          <span>
                            Available{" "}
                            <strong className="text-zinc-700">
                              {available}
                            </strong>
                          </span>
                          <span>
                            Sold{" "}
                            <strong className="text-zinc-700">
                              {item.quantitySold}
                            </strong>
                          </span>
                          <span>
                            {item.marketplace}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center justify-between gap-5 border-t border-zinc-100 pt-4 lg:w-[280px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                          Price
                        </p>
                        <p className="mt-1 text-xl font-semibold">
                          {money(price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/listings/${item.id}`}
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                        >
                          View
                        </Link>

                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => removeListing(item.id)}
                          className="rounded-full border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === item.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!visible.length && (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-white p-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1effb] text-xl text-[#5b47cc]">
                  ▤
                </div>
                <p className="mt-4 text-base font-semibold">
                  No listings found
                </p>
                <p className="mt-1 text-sm text-zinc-400">
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
            )}
          </div>
        </div>
      </div>

      {/* Mobile app navigation — matches the Dashboard exactly */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {[
            ["⌂", "Home", "/"],
            ["＋", "Add", "/add"],
            ["▣", "Stock", "/inventory"],
            ["◇", "Listings", "/listings"],
            ["£", "Sales", "/sales"],
          ].map(([icon, label, href]) => {
            const active =
              (href === "/" && pathname === "/") ||
              (href !== "/" && pathname.startsWith(href));

            return (
              <a
                key={href}
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-semibold transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-400 hover:bg-[#f4f4f5]"
                }`}
              >
                <span className="text-lg leading-none">{icon}</span>
                <span className="mt-1">{label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </main>
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
          <p className="text-xs font-medium text-zinc-400">{label}</p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${classes[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}