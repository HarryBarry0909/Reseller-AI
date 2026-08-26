"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import Link from "next/link";

import { Lexend } from "next/font/google";

import {
  deleteListing,
  getImageSet,
  getListings,
  type ListingRecord,
} from "../../lib/listing-store";

const lexend = Lexend({
  subsets: ["latin"],
});

/* =========================================================
   FILTERS
========================================================= */

const filters = [
  "All",
  "Draft",
  "Ready to List",
  "Listed",
  "Sold",
  "Unsold",
  "Removed",
] as const;

type Filter =
  (typeof filters)[number];

/* =========================================================
   HELPERS
========================================================= */

function money(
  value:
    | number
    | null
    | undefined
) {

  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `£${value.toFixed(2)}`;
}

function getTitle(
  item: ListingRecord
) {

  return (
    item.listing?.title ||
    item.product?.item_type ||
    "Untitled item"
  );
}

function getBrand(
  item: ListingRecord
) {

  return (
    item.product?.brand ||
    "Unknown brand"
  );
}

function getPrice(
  item: ListingRecord
) {

  const selling =
    item.selling as
      | {
          price?:
            | number
            | null;

          customPrice?:
            | number
            | null;
        }
      | undefined;

  return (
    selling?.price ??
    selling?.customPrice ??
    null
  );
}

function getROI(
  item: ListingRecord
) {

  if (
    typeof item.estimatedROI ===
      "number" &&
    Number.isFinite(
      item.estimatedROI
    )
  ) {

    return item.estimatedROI;

  }

  const purchase =
    Number(
      item.purchasePrice ||
        0
    );

  const sale =
    Number(
      getPrice(item) ||
        0
    );

  if (
    purchase <= 0
  ) {
    return null;
  }

  return (
    ((sale - purchase) /
      purchase) *
    100
  );
}

/* =========================================================
   IMAGE
========================================================= */

function InventoryThumb({
  item,
}: {
  item: ListingRecord;
}) {

  const [src, setSrc] =
    useState("");

  useEffect(() => {

    let alive = true;

    let objectUrl = "";

    async function loadImage() {

      try {

        if (
          !item.imageSetId ||
          !item.imageCount
        ) {
          return;
        }

        const blobs =
          await getImageSet(
            item.imageSetId,
            item.imageCount
          );

        if (
          !alive ||
          !blobs[0]
        ) {
          return;
        }

        objectUrl =
          URL.createObjectURL(
            blobs[0]
          );

        setSrc(
          objectUrl
        );

      } catch (
        error
      ) {

        console.error(
          "Failed to load inventory image:",
          error
        );

      }
    }

    void loadImage();

    return () => {

      alive = false;

      if (objectUrl) {

        URL.revokeObjectURL(
          objectUrl
        );

      }

    };

  }, [
    item.imageSetId,
    item.imageCount,
  ]);

  if (src) {

    return (
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
      />
    );

  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-2xl text-zinc-300">
      ▧
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusPill({
  status,
}: {
  status: ListingRecord["status"];
}) {

  let classes =
    "bg-zinc-100 text-zinc-600";

  if (
    status === "Listed"
  ) {

    classes =
      "bg-blue-50 text-blue-700";

  }

  if (
    status === "Ready to List"
  ) {

    classes =
      "bg-violet-50 text-violet-700";

  }

  if (
    status === "Sold"
  ) {

    classes =
      "bg-emerald-50 text-emerald-700";

  }

  if (
    status === "Removed"
  ) {

    classes =
      "bg-red-50 text-red-600";

  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {

  return (
    <div className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs font-medium text-zinc-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight">
            {value}
          </p>

        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeafa] text-lg font-bold text-[#5945c7]">
          {icon}
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function InventoryPage() {

  const pathname =
    usePathname();

  const [items, setItems] =
    useState<
      ListingRecord[]
    >([]);

  const [filter, setFilter] =
    useState<Filter>(
      "All"
    );

  const [search, setSearch] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<
      string | null
    >(null);

  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {

    setItems(
      getListings()
    );

  }

  useEffect(() => {

    refresh();

    const handleChange =
      () => refresh();

    window.addEventListener(
      "reseller-ai-listings-changed",
      handleChange
    );

    window.addEventListener(
      "storage",
      handleChange
    );

    return () => {

      window.removeEventListener(
        "reseller-ai-listings-changed",
        handleChange
      );

      window.removeEventListener(
        "storage",
        handleChange
      );

    };

  }, []);

  /* =======================================================
     FILTER
  ======================================================= */

  const visibleItems =
    useMemo(() => {

      const query =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {

          const matchesFilter =
            filter === "All" ||
            item.status ===
              filter;

          const haystack =
            [
              getTitle(item),
              getBrand(item),
              item.product?.model,
              item.category,
              item.condition,
              item.marketplace,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return (
            matchesFilter &&
            haystack.includes(
              query
            )
          );

        }
      );

    }, [
      items,
      filter,
      search,
    ]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = {

    total:
      items.length,

    inStock:
      items.filter(
        (item) =>
          item.status !==
            "Sold" &&
          item.status !==
            "Removed" &&
          item.quantitySold <
            item.quantity
      ).length,

    listed:
      items.filter(
        (item) =>
          item.status ===
          "Listed"
      ).length,

    sold:
      items.filter(
        (item) =>
          item.status ===
          "Sold"
      ).length,

  };

  /* =======================================================
     DELETE
  ======================================================= */

  async function removeItem(
    id: string
  ) {

    const item =
      items.find(
        (entry) =>
          entry.id === id
      );

    if (!item) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove "${getTitle(
          item
        )}" completely?\n\nThis removes the saved item and its stored images from this browser.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {

      deleteListing(id);

      refresh();

    } catch (
      error
    ) {

      console.error(
        "Failed to remove inventory item:",
        error
      );

    } finally {

      setDeletingId(
        null
      );

    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <main
      className={`${lexend.className} min-h-screen bg-[#f4f4f5] pb-24 text-zinc-900 lg:pb-8`}
    >

      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}

        <header className="border-b border-zinc-200/70 bg-white">

          <div className="flex min-h-[82px] items-center justify-between gap-4 px-5 sm:px-8">

            <div>

              <Link
                href="/"
                className="text-xs font-semibold text-[#5b47cc] hover:text-[#4936b5]"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
                Inventory
              </h1>

              <p className="mt-1 hidden text-sm text-zinc-400 sm:block">
                Everything you currently own.
              </p>

            </div>

            <Link
              href="/add"
              className="inline-flex items-center gap-2 rounded-full bg-[#5540c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
            >
              <span className="text-lg">
                ＋
              </span>

              Add Item
            </Link>

          </div>

        </header>

        <div className="p-4 sm:p-6">

          {/* STATS */}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

            <StatCard
              label="Total Items"
              value={stats.total}
              icon="▣"
            />

            <StatCard
              label="In Stock"
              value={stats.inStock}
              icon="□"
            />

            <StatCard
              label="Listed"
              value={stats.listed}
              icon="↗"
            />

            <StatCard
              label="Sold"
              value={stats.sold}
              icon="£"
            />

          </div>

          {/* FILTERS */}

          <section className="mt-4 rounded-[20px] border border-zinc-200/80 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex gap-1.5 overflow-x-auto pb-1">

                {filters.map(
                  (item) => (

                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setFilter(
                          item
                        )
                      }
                      className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold transition ${
                        filter ===
                        item
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      }`}
                    >
                      {item}
                    </button>

                  )
                )}

              </div>

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search inventory..."
                className="w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-[#5540c8] focus:bg-white lg:max-w-xs"
              />

            </div>

          </section>

          {/* INVENTORY */}

          <section className="mt-4">

            {visibleItems.length ===
            0 ? (

              <div className="rounded-[20px] border border-zinc-200/80 bg-white px-6 py-16 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eeeafa] text-xl text-[#5945c7]">
                  ▣
                </div>

                <h2 className="mt-4 font-semibold">
                  No inventory found
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  {search ||
                  filter !== "All"
                    ? "Try changing your search or filter."
                    : "Save your first item and it will appear here."}
                </p>

                {!search &&
                  filter ===
                    "All" && (

                    <Link
                      href="/add"
                      className="mt-4 inline-flex rounded-full bg-[#5540c8] px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      ＋ Add Item
                    </Link>

                  )}

              </div>

            ) : (

              <div className="overflow-hidden rounded-[20px] border border-zinc-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

                {/* DESKTOP HEADER */}

                <div className="hidden border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 md:grid md:grid-cols-[72px_minmax(220px,1fr)_120px_120px_110px_120px_70px] md:items-center md:gap-4">

                  <span>
                    Image
                  </span>

                  <span>
                    Item
                  </span>

                  <span>
                    Purchase
                  </span>

                  <span>
                    Sell Price
                  </span>

                  <span>
                    ROI
                  </span>

                  <span>
                    Status
                  </span>

                  <span />

                </div>

                {/* ITEMS */}

                <div>

                  {visibleItems.map(
                    (item) => {

                      const price =
                        getPrice(
                          item
                        );

                      const roi =
                        getROI(
                          item
                        );

                      return (

                        <div
                          key={
                            item.id
                          }
                          className="border-b border-zinc-100 px-3 py-3 last:border-b-0 sm:px-4"
                        >

                          {/* DESKTOP */}

                          <div className="hidden md:grid md:grid-cols-[72px_minmax(220px,1fr)_120px_120px_110px_120px_70px] md:items-center md:gap-4">

                            <div className="h-[64px] w-[64px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">

                              <InventoryThumb
                                item={
                                  item
                                }
                              />

                            </div>

                            <div className="min-w-0">

                              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                                {getBrand(
                                  item
                                )}
                              </p>

                              <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5">
                                {getTitle(
                                  item
                                )}
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                                Purchase
                              </p>

                              <p className="mt-0.5 text-sm font-semibold">
                                {money(
                                  item.purchasePrice
                                )}
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                                Sell
                              </p>

                              <p className="mt-0.5 text-sm font-semibold">
                                {money(
                                  price
                                )}
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                                ROI
                              </p>

                              <p
                                className={`mt-0.5 text-sm font-semibold ${
                                  roi !==
                                    null &&
                                  roi >=
                                    0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {roi !==
                                null
                                  ? `${roi.toFixed(
                                      1
                                    )}%`
                                  : "—"}
                              </p>

                            </div>

                            <div>

                              <StatusPill
                                status={
                                  item.status
                                }
                              />

                            </div>

                            <Link
                              href={`/listings/${item.id}`}
                              className="text-right text-xs font-semibold text-[#5540c8] hover:text-[#4936b5]"
                            >
                              View →
                            </Link>

                          </div>

                          {/* MOBILE */}

                          <div className="flex items-center gap-3 md:hidden">

                            <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">

                              <InventoryThumb
                                item={
                                  item
                                }
                              />

                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0">

                                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                                    {getBrand(
                                      item
                                    )}
                                  </p>

                                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-4">
                                    {getTitle(
                                      item
                                    )}
                                  </p>

                                </div>

                                <StatusPill
                                  status={
                                    item.status
                                  }
                                />

                              </div>

                              <div className="mt-2 grid grid-cols-3 gap-2">

                                <div>

                                  <p className="text-[9px] text-zinc-400">
                                    Buy
                                  </p>

                                  <p className="text-xs font-semibold">
                                    {money(
                                      item.purchasePrice
                                    )}
                                  </p>

                                </div>

                                <div>

                                  <p className="text-[9px] text-zinc-400">
                                    Sell
                                  </p>

                                  <p className="text-xs font-semibold">
                                    {money(
                                      price
                                    )}
                                  </p>

                                </div>

                                <div>

                                  <p className="text-[9px] text-zinc-400">
                                    ROI
                                  </p>

                                  <p
                                    className={`text-xs font-semibold ${
                                      roi !==
                                        null &&
                                      roi >=
                                        0
                                        ? "text-emerald-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {roi !==
                                    null
                                      ? `${roi.toFixed(
                                          1
                                        )}%`
                                      : "—"}
                                  </p>

                                </div>

                              </div>

                            </div>

                            <Link
                              href={`/listings/${item.id}`}
                              className="shrink-0 text-xs font-semibold text-[#5540c8]"
                            >
                              →
                            </Link>

                          </div>

                          <div className="mt-2 flex justify-end md:mt-1">

                            <button
                              type="button"
                              onClick={() =>
                                void removeItem(
                                  item.id
                                )
                              }
                              disabled={
                                deletingId ===
                                item.id
                              }
                              className="text-[10px] font-medium text-red-400 hover:text-red-600 disabled:opacity-50"
                            >
                              {deletingId ===
                              item.id
                                ? "Removing..."
                                : "Remove"}
                            </button>

                          </div>

                        </div>

                      );
                    }
                  )}

                </div>

              </div>

            )}

          </section>

        </div>

      </div>

      {/* MOBILE NAV */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">

        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">

          {[
            ["⌂", "Home", "/"],
            ["＋", "Add", "/add"],
            ["▣", "Stock", "/inventory"],
            ["◇", "Listings", "/listings"],
            ["£", "Sales", "/sales"],
          ].map(
            ([
              icon,
              label,
              href,
            ]) => {

              const active =
                href === "/"
                  ? pathname ===
                    "/"
                  : pathname.startsWith(
                      href
                    );

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

                  <span className="mt-1">
                    {label}
                  </span>

                </Link>

              );

            }
          )}

        </div>

      </nav>

    </main>
  );
}