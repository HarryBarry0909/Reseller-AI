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

type Filter = (typeof filters)[number];

/* =========================================================
   HELPERS
========================================================= */

function money(
  value: number | null | undefined
): string {
  if (
    value == null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return `£${value.toFixed(2)}`;
}

function getProductValue(
  item: InventoryItem,
  key: string
): string {
  const value =
    item.product?.[key];

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function getTitle(
  item: InventoryItem
): string {
  const listingTitle =
    item.listing?.title;

  if (
    listingTitle &&
    typeof listingTitle === "string"
  ) {
    return listingTitle;
  }

  const itemType =
    getProductValue(
      item,
      "item_type"
    );

  return (
    itemType ||
    "Untitled item"
  );
}

function getBrand(
  item: InventoryItem
): string {
  return (
    getProductValue(
      item,
      "brand"
    ) ||
    "Unknown brand"
  );
}

function getModel(
  item: InventoryItem
): string {
  return getProductValue(
    item,
    "model"
  );
}

function getSalePrice(
  item: InventoryItem
): number | null {
  const selling =
    item.selling as
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

function getROI(
  item: InventoryItem
): number | null {
  if (
    item.estimatedROI !== null &&
    item.estimatedROI !== undefined &&
    Number.isFinite(
      item.estimatedROI
    )
  ) {
    return item.estimatedROI;
  }

  const purchase =
    Number(
      item.purchasePrice || 0
    );

  const sale =
    Number(
      getSalePrice(item) || 0
    );

  if (purchase <= 0) {
    return null;
  }

  return (
    ((sale - purchase) /
      purchase) *
    100
  );
}

/* =========================================================
   STATUS PILL
========================================================= */

function StatusPill({
  status,
}: {
  status: InventoryItem["status"];
}) {
  let classes =
    "bg-zinc-100 text-zinc-600";

  if (status === "Sold") {
    classes =
      "bg-emerald-50 text-emerald-700";
  }

  if (status === "Listed") {
    classes =
      "bg-blue-50 text-blue-700";
  }

  if (status === "Ready to List") {
    classes =
      "bg-violet-50 text-violet-700";
  }

  if (status === "Removed") {
    classes =
      "bg-red-50 text-red-600";
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}
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
  const toneClasses = {
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
    <div className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${toneClasses[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
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
  const [imageUrl, setImageUrl] =
    useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    async function loadImage() {
      try {
        if (
          !item.imageSetId ||
          !item.imageCount
        ) {
          return;
        }

        const store =
          await import(
            "../../lib/listing-store"
          );

        if (
          typeof store.getImageSet !==
          "function"
        ) {
          return;
        }

        const blobs =
          await store.getImageSet(
            item.imageSetId,
            item.imageCount
          );

        if (
          cancelled ||
          !blobs ||
          !blobs[0]
        ) {
          return;
        }

        objectUrl =
          URL.createObjectURL(
            blobs[0]
          );

        setImageUrl(
          objectUrl
        );
      } catch (error) {
        console.error(
          "Inventory image could not be loaded:",
          error
        );
      }
    }

    void loadImage();

    return () => {
      cancelled = true;

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

  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-16 sm:w-16">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl text-zinc-300">
          ▧
        </div>
      )}
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
    useState<InventoryItem[]>(
      []
    );

  const [filter, setFilter] =
    useState<Filter>("All");

  const [search, setSearch] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<string | null>(
      null
    );

  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {
    setItems(
      getInventory()
    );
  }

  useEffect(() => {
    refresh();

    const handleChange =
      () => {
        refresh();
      };

    window.addEventListener(
      "reseller-ai-inventory-changed",
      handleChange
    );

    window.addEventListener(
      "storage",
      handleChange
    );

    return () => {
      window.removeEventListener(
        "reseller-ai-inventory-changed",
        handleChange
      );

      window.removeEventListener(
        "storage",
        handleChange
      );
    };
  }, []);

  /* =======================================================
     FILTER + SEARCH
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

          const searchText = [
            getTitle(item),
            getBrand(item),
            getModel(item),
            item.category,
            item.condition,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            matchesFilter &&
            searchText.includes(
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
        )}" completely?\n\nThis removes the saved item from this browser.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      deleteInventoryItem(
        id
      );

      refresh();
    } catch (error) {
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
     PAGE
  ======================================================= */

  return (
    <main
      className={`${lexend.className} min-h-screen bg-[#f4f4f5] pb-24 text-[#20202a] lg:pb-8`}
    >
      <div className="mx-auto min-h-screen max-w-[1800px]">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="border-b border-zinc-200/70 bg-white">
          <div className="flex min-h-[82px] items-center justify-between gap-4 px-4 sm:px-8 xl:px-10">

            <div>
              <Link
                href="/"
                className="text-xs font-semibold text-[#5b47cc] hover:text-[#4936b5]"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Inventory
              </h1>

              <p className="mt-1 hidden text-sm text-zinc-400 sm:block">
                Everything you currently own and have available to sell.
              </p>
            </div>

            <Link
              href="/add"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#5540c8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
            >
              <span className="text-lg leading-none">
                ＋
              </span>

              Add Item
            </Link>

          </div>
        </header>

        <div className="p-4 sm:p-8 xl:p-10">

          {/* =================================================
              STATS
          ================================================= */}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

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

          {/* =================================================
              FILTERS
          ================================================= */}

          <section className="mt-4 rounded-[20px] border border-zinc-200/80 bg-white p-3 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

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
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        filter === item
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

                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                  ⌕
                </span>

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
                  className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-4 text-xs outline-none transition focus:border-[#5540c8] focus:bg-white"
                />

              </div>

            </div>

          </section>

          {/* =================================================
              INVENTORY
          ================================================= */}

          <section className="mt-4">

            {visibleItems.length ===
            0 ? (

              <div className="rounded-[20px] border border-zinc-200/80 bg-white px-6 py-16 text-center shadow-[0_2px_8px_rgba(0,0,0,0.025)]">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eeeafa] text-xl text-[#5945c7]">
                  ▣
                </div>

                <h2 className="mt-4 text-lg font-semibold">
                  No inventory found
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
                  {search ||
                  filter !==
                    "All"
                    ? "Try changing your search or filter."
                    : "Analyse and save your first item to see it here."}
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

                {/* =================================================
                    DESKTOP HEADER
                ================================================= */}

                <div className="hidden border-b border-zinc-100 bg-zinc-50/70 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400 lg:grid lg:grid-cols-[minmax(280px,2.5fr)_110px_110px_100px_130px_70px_70px] lg:items-center lg:gap-4">

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

                  <span>
                    Stock
                  </span>

                  <span />

                </div>

                {/* =================================================
                    ROWS
                ================================================= */}

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

                      const remaining =
                        Math.max(
                          0,
                          Number(
                            item.quantity ||
                              0
                          ) -
                            Number(
                              item.quantitySold ||
                                0
                            )
                        );

                      const model =
                        getModel(
                          item
                        );

                      return (
                        <div
                          key={
                            item.id
                          }
                          className="group px-3 py-2.5 transition hover:bg-zinc-50/80 sm:px-4"
                        >

                          {/* =================================================
                              DESKTOP
                          ================================================= */}

                          <div className="hidden lg:grid lg:grid-cols-[minmax(280px,2.5fr)_110px_110px_100px_130px_70px_70px] lg:items-center lg:gap-4">

                            {/* ITEM */}

                            <div className="flex min-w-0 items-center gap-3">

                              <InventoryImage
                                item={
                                  item
                                }
                              />

                              <div className="min-w-0">

                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                                  {getBrand(
                                    item
                                  )}
                                </p>

                                <h2 className="mt-0.5 truncate text-sm font-semibold text-zinc-800">
                                  {getTitle(
                                    item
                                  )}
                                </h2>

                                {model && (
                                  <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                                    {model}
                                  </p>
                                )}

                              </div>

                            </div>

                            {/* PURCHASE */}

                            <div>
                              <p className="text-[10px] text-zinc-400">
                                Purchase
                              </p>

                              <p className="mt-0.5 text-sm font-semibold">
                                {money(
                                  item.purchasePrice
                                )}
                              </p>
                            </div>

                            {/* SELL */}

                            <div>
                              <p className="text-[10px] text-zinc-400">
                                Sale
                              </p>

                              <p className="mt-0.5 text-sm font-semibold">
                                {money(
                                  salePrice
                                )}
                              </p>
                            </div>

                            {/* ROI */}

                            <div>
                              <p className="text-[10px] text-zinc-400">
                                ROI
                              </p>

                              <p
                                className={`mt-0.5 text-sm font-semibold ${
                                  roi !== null &&
                                  roi >= 0
                                    ? "text-emerald-600"
                                    : "text-red-500"
                                }`}
                              >
                                {roi !== null
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

                            {/* STOCK */}

                            <div>
                              <p className="text-[10px] text-zinc-400">
                                Stock
                              </p>

                              <p className="mt-0.5 text-sm font-semibold">
                                {remaining}
                              </p>
                            </div>

                            {/* VIEW */}

                            <div className="flex justify-end">

                              <Link
                                href={`/listings/${item.id}`}
                                className="rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-semibold text-zinc-600 transition hover:bg-zinc-100"
                              >
                                View
                              </Link>

                            </div>

                          </div>

                          {/* =================================================
                              MOBILE
                          ================================================= */}

                          <div className="flex items-center gap-3 lg:hidden">

                            <InventoryImage
                              item={
                                item
                              }
                            />

                            <div className="min-w-0 flex-1">

                              <div className="flex items-center gap-2">

                                <p className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-zinc-400">
                                  {getBrand(
                                    item
                                  )}
                                </p>

                                <StatusPill
                                  status={
                                    item.status
                                  }
                                />

                              </div>

                              <h2 className="mt-0.5 truncate text-sm font-semibold">
                                {getTitle(
                                  item
                                )}
                              </h2>

                              <div className="mt-1.5 flex items-center gap-3 overflow-hidden text-[10px]">

                                <span className="whitespace-nowrap text-zinc-400">
                                  Buy{" "}
                                  <strong className="text-zinc-700">
                                    {money(
                                      item.purchasePrice
                                    )}
                                  </strong>
                                </span>

                                <span className="whitespace-nowrap text-zinc-400">
                                  Sell{" "}
                                  <strong className="text-zinc-700">
                                    {money(
                                      salePrice
                                    )}
                                  </strong>
                                </span>

                                <span
                                  className={`whitespace-nowrap font-semibold ${
                                    roi !== null &&
                                    roi >= 0
                                      ? "text-emerald-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {roi !== null
                                    ? `${roi.toFixed(
                                        0
                                      )}% ROI`
                                    : "—"}
                                </span>

                              </div>

                            </div>

                            <Link
                              href={`/listings/${item.id}`}
                              className="shrink-0 rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-semibold text-zinc-600 transition hover:bg-zinc-50"
                            >
                              View
                            </Link>

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

      {/* =====================================================
          MOBILE NAV
      ===================================================== */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">

        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">

          {[
            ["⌂", "Home", "/"],
            ["＋", "Add", "/add"],
            ["▣", "Stock", "/inventory"],
            ["◇", "Listings", "/listings"],
            ["£", "Sales", "/sales"],
          ].map(
            ([icon, label, href]) => {

              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(
                      href
                    );

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[10px] font-semibold transition ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-400 hover:bg-[#f4f4f5]"
                  }`}
                >

                  <span className="text-base leading-none">
                    {icon}
                  </span>

                  <span className="mt-0.5">
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