"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lexend } from "next/font/google";

import {
  deleteInventoryItem,
  getInventory,
  type InventoryItem,
  type InventoryStatus,
} from "../../lib/inventory-store";

import { getImageSet } from "../../lib/listing-store";

const lexend = Lexend({
  subsets: ["latin"],
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

/* =========================================================
   HELPERS
========================================================= */

function money(value: number | null | undefined) {
  if (
    value == null ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `£${Number(value).toFixed(2)}`;
}

function getTitle(item: InventoryItem) {
  return (
    item.listing?.title ||
    String(item.product?.item_type || "") ||
    "Untitled item"
  );
}

function getBrand(item: InventoryItem) {
  return (
    String(item.product?.brand || "") ||
    "Unknown brand"
  );
}

function getSalePrice(item: InventoryItem) {
  const selling = item.selling as
    | {
        price?: number | null;
        customPrice?: number | null;
      }
    | undefined;

  if (selling?.price != null) {
    return Number(selling.price);
  }

  if (selling?.customPrice != null) {
    return Number(selling.customPrice);
  }

  return null;
}

function getROI(item: InventoryItem) {
  if (
    item.estimatedROI != null &&
    Number.isFinite(Number(item.estimatedROI))
  ) {
    return Number(item.estimatedROI);
  }

  const purchasePrice =
    Number(item.purchasePrice || 0);

  const salePrice =
    getSalePrice(item);

  if (
    purchasePrice <= 0 ||
    salePrice == null
  ) {
    return null;
  }

  return (
    ((salePrice - purchasePrice) /
      purchasePrice) *
    100
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusPill({
  status,
}: {
  status: InventoryStatus;
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
            : status === "Unsold"
              ? "bg-amber-50 text-amber-700"
              : "bg-zinc-100 text-zinc-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   INVENTORY IMAGE
========================================================= */

function InventoryImage({
  item,
}: {
  item: InventoryItem;
}) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";

    async function loadImage() {
      try {
        if (
          !item.imageSetId ||
          Number(item.imageCount || 0) <= 0
        ) {
          return;
        }

        const images =
          await getImageSet(
            item.imageSetId,
            Number(item.imageCount)
          );

        if (
          !alive ||
          !images ||
          !images[0]
        ) {
          return;
        }

        objectUrl =
          URL.createObjectURL(
            images[0]
          );

        setSrc(objectUrl);
      } catch (error) {
        console.error(
          "Inventory image failed:",
          error
        );

        if (alive) {
          setFailed(true);
        }
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

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={getTitle(item)}
        className="h-full w-full object-cover"
        onError={() =>
          setFailed(true)
        }
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-3xl text-zinc-300">
      ▧
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone:
    | "violet"
    | "blue"
    | "green"
    | "amber";
}) {
  const classes = {
    violet:
      "bg-[#eeeafa] text-[#5945c7]",
    blue:
      "bg-blue-50 text-blue-600",
    green:
      "bg-emerald-50 text-emerald-600",
    amber:
      "bg-amber-50 text-amber-600",
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

/* =========================================================
   PAGE
========================================================= */

export default function InventoryPage() {
  const [items, setItems] =
    useState<InventoryItem[]>([]);

  const [filter, setFilter] =
    useState<Filter>("All");

  const [search, setSearch] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /* =======================================================
     REFRESH INVENTORY
  ======================================================= */

  function refresh() {
    const inventory =
      getInventory();

    console.log(
      "INVENTORY PAGE LOADED:",
      inventory
    );

    setItems(inventory);
  }

  useEffect(() => {
    refresh();

    const handleInventoryChange =
      () => {
        refresh();
      };

    window.addEventListener(
      "reseller-ai-inventory-changed",
      handleInventoryChange
    );

    window.addEventListener(
      "storage",
      handleInventoryChange
    );

    return () => {
      window.removeEventListener(
        "reseller-ai-inventory-changed",
        handleInventoryChange
      );

      window.removeEventListener(
        "storage",
        handleInventoryChange
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
            item.status === filter;

          const searchableText = [
            getTitle(item),
            getBrand(item),
            item.product?.model,
            item.category,
            item.condition,
            item.sellerStatus,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !query ||
            searchableText.includes(
              query
            );

          return (
            matchesFilter &&
            matchesSearch
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
          item.status !== "Sold" &&
          item.status !== "Removed" &&
          Number(
            item.quantitySold || 0
          ) <
            Number(
              item.quantity || 0
            )
      ).length,

    listed:
      items.filter(
        (item) =>
          item.status === "Listed"
      ).length,

    sold:
      items.filter(
        (item) =>
          item.status === "Sold"
      ).length,
  };

  /* =======================================================
     DELETE
  ======================================================= */

  function removeItem(
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
        )}" from inventory?\n\nThis removes the saved inventory item from this browser.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      deleteInventoryItem(id);

      refresh();
    } catch (error) {
      console.error(
        "Failed to remove inventory item:",
        error
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main
      className={`${lexend.className} min-h-screen bg-[#f4f4f5] pb-24 text-[#20202a] lg:pb-8`}
    >
      <div className="mx-auto min-h-screen max-w-[1800px]">

        {/* HEADER */}

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
                Everything you currently own and have available to sell.
              </p>

            </div>

            <Link
              href="/add"
              className="inline-flex items-center gap-2 rounded-full bg-[#5540c8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
            >
              <span className="text-lg">
                ＋
              </span>

              Add Item
            </Link>

          </div>
        </header>

        {/* CONTENT */}

        <div className="p-5 sm:p-8 xl:p-10">

          {/* STATS */}

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

          {/* FILTERS */}

          <section className="mt-5 rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex flex-wrap gap-2">

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
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
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

              <div className="relative w-full xl:max-w-sm">

                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search inventory..."
                  className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#5540c8] focus:bg-white"
                />

              </div>

            </div>

          </section>

          {/* INVENTORY */}

          <section className="mt-5">

            {visibleItems.length ===
            0 ? (

              <div className="rounded-[24px] border border-zinc-200/80 bg-white px-6 py-20 text-center shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eeeafa] text-2xl text-[#5945c7]">
                  ▣
                </div>

                <h2 className="mt-5 text-lg font-semibold">
                  No inventory found
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                  {search ||
                  filter !==
                    "All"
                    ? "Try changing your search or filter."
                    : "Save an item to inventory and it will appear here."}
                </p>

                {!search &&
                  filter ===
                    "All" && (

                    <Link
                      href="/add"
                      className="mt-5 inline-flex rounded-full bg-[#5540c8] px-5 py-3 text-sm font-semibold text-white"
                    >
                      ＋ Add Item
                    </Link>

                  )}

              </div>

            ) : (

              <div className="overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

                {/* DESKTOP HEADER */}

                <div className="hidden grid-cols-[72px_minmax(220px,1fr)_130px_130px_110px_130px_110px] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 md:grid">

                  <span>
                    Photo
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

                <div className="divide-y divide-zinc-100">

                  {visibleItems.map(
                    (item) => {

                      const salePrice =
                        getSalePrice(
                          item
                        );

                      const roi =
                        getROI(
                          item
                        );

                      return (

                        <article
                          key={
                            item.id
                          }
                          className="grid gap-4 px-4 py-4 transition hover:bg-zinc-50 sm:px-5 md:grid-cols-[72px_minmax(220px,1fr)_130px_130px_110px_130px_110px] md:items-center"
                        >

                          {/* IMAGE */}

                          <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">

                            <InventoryImage
                              item={
                                item
                              }
                            />

                          </div>

                          {/* ITEM */}

                          <div className="min-w-0">

                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                              {getBrand(
                                item
                              )}
                            </p>

                            <h2 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900">
                              {getTitle(
                                item
                              )}
                            </h2>

                            <p className="mt-1 text-xs text-zinc-400">
                              {item.category ||
                                item.condition ||
                                "Item"}
                            </p>

                          </div>

                          {/* PURCHASE */}

                          <div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 md:hidden">
                              Purchase
                            </p>

                            <p className="mt-1 font-semibold">
                              {money(
                                item.purchasePrice
                              )}
                            </p>

                          </div>

                          {/* SELL PRICE */}

                          <div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 md:hidden">
                              Sell Price
                            </p>

                            <p className="mt-1 font-semibold">
                              {money(
                                salePrice
                              )}
                            </p>

                          </div>

                          {/* ROI */}

                          <div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 md:hidden">
                              ROI
                            </p>

                            <p
                              className={`mt-1 font-semibold ${
                                roi !=
                                  null &&
                                roi >=
                                  0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }`}
                            >
                              {roi !=
                              null
                                ? `${roi.toFixed(
                                    1
                                  )}%`
                                : "—"}
                            </p>

                          </div>

                          {/* STATUS */}

                          <div>

                            <StatusPill
                              status={
                                item.status
                              }
                            />

                          </div>

                          {/* VIEW */}

                          <div className="flex justify-end">

                            <Link
                              href={`/inventory/${item.id}`}
                              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100"
                            >
                              View
                            </Link>

                          </div>

                          {/* DELETE */}

                          <div className="md:col-span-7">

                            <button
                              type="button"
                              onClick={() =>
                                removeItem(
                                  item.id
                                )
                              }
                              disabled={
                                deletingId ===
                                item.id
                              }
                              className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                            >
                              {deletingId ===
                              item.id
                                ? "Removing..."
                                : "Remove Item"}
                            </button>

                          </div>

                        </article>

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
            ([icon, label, href]) => (

              <Link
                key={href}
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-semibold transition ${
                  href ===
                  "/inventory"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-400 hover:bg-zinc-100"
                }`}
              >

                <span className="text-lg leading-none">
                  {icon}
                </span>

                <span className="mt-1">
                  {label}
                </span>

              </Link>

            )
          )}

        </div>

      </nav>

    </main>
  );
}