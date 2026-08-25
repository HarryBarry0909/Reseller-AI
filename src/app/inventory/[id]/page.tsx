"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lexend } from "next/font/google";

import {
  deleteInventoryItem,
  getInventoryItem,
  updateInventoryItem,
  type InventoryItem,
  type InventoryStatus,
} from "../../../lib/inventory-store";

import { getImageSet } from "../../../lib/listing-store";

const lexend = Lexend({
  subsets: ["latin"],
});

/* =========================================================
   HELPERS
========================================================= */

function money(value: unknown): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "£0.00";
  }

  return `£${number.toFixed(2)}`;
}

function displayValue(
  value: unknown,
  fallback = "Not specified"
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        displayValue(item, "")
      )
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

function getObjectValue(
  object: Record<string, unknown> | null | undefined,
  key: string
): unknown {
  if (!object) {
    return undefined;
  }

  return object[key];
}

function getProductValue(
  item: InventoryItem,
  key: string
): unknown {
  return getObjectValue(
    item.product,
    key
  );
}

function getItemSpecific(
  item: InventoryItem,
  key: string
): unknown {
  return getObjectValue(
    item.itemSpecifics,
    key
  );
}

function getConditionData(
  item: InventoryItem
): Record<string, unknown> | null {
  const condition =
    getProductValue(
      item,
      "condition"
    );

  if (
    condition &&
    typeof condition === "object" &&
    !Array.isArray(condition)
  ) {
    return condition as Record<
      string,
      unknown
    >;
  }

  return null;
}

function getFeatures(
  item: InventoryItem
): unknown[] {
  const features =
    getProductValue(
      item,
      "features"
    );

  return Array.isArray(features)
    ? features
    : [];
}

function getVisibleText(
  item: InventoryItem
): unknown[] {
  const text =
    getProductValue(
      item,
      "visible_text"
    );

  return Array.isArray(text)
    ? text
    : [];
}

/* =========================================================
   STATUS
========================================================= */

const statuses: InventoryStatus[] = [
  "Draft",
  "Ready to List",
  "Listed",
  "Sold",
  "Unsold",
  "Removed",
];

function statusClasses(
  status: InventoryStatus
): string {
  switch (status) {
    case "Listed":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Ready to List":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "Sold":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Unsold":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Removed":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

/* =========================================================
   IMAGE GALLERY
========================================================= */

function ImageGallery({
  item,
}: {
  item: InventoryItem;
}) {
  const [images, setImages] =
    useState<string[]>([]);

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(0);

  useEffect(() => {
    let alive = true;
    const objectUrls: string[] = [];

    async function loadImages(): Promise<void> {
      if (
        !item.imageSetId ||
        !item.imageCount
      ) {
        return;
      }

      try {
        const blobs: Blob[] =
          await getImageSet(
            item.imageSetId,
            item.imageCount
          );

        if (!alive) {
          return;
        }

        const urls = blobs.map(
          (blob: Blob) => {
            const url =
              URL.createObjectURL(blob);

            objectUrls.push(url);

            return url;
          }
        );

        setImages(urls);
      } catch (error) {
        console.error(
          "Failed to load inventory images:",
          error
        );
      }
    }

    void loadImages();

    return () => {
      alive = false;

      objectUrls.forEach(
        (url) =>
          URL.revokeObjectURL(url)
      );
    };
  }, [
    item.imageSetId,
    item.imageCount,
  ]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-[24px] bg-zinc-100 text-6xl text-zinc-300">
        ▧
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
        <img
          src={images[selectedImage]}
          alt={item.listing.title}
          className="aspect-square w-full object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map(
            (image, index) => (
              <button
                key={image}
                type="button"
                onClick={() =>
                  setSelectedImage(index)
                }
                className={`overflow-hidden rounded-xl border-2 bg-white ${
                  selectedImage ===
                  index
                    ? "border-[#5540c8]"
                    : "border-zinc-200"
                }`}
              >
                <img
                  src={image}
                  alt={`Product photo ${
                    index + 1
                  }`}
                  className="aspect-square w-full object-cover"
                />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INFORMATION CARD
========================================================= */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-zinc-800">
        {displayValue(value)}
      </p>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function InventoryItemPage() {
  const params = useParams();
  const router = useRouter();

  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [item, setItem] =
    useState<InventoryItem | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [savingStatus, setSavingStatus] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD ITEM
  ======================================================= */

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const found =
      getInventoryItem(id);

    setItem(found);
    setLoading(false);
  }, [id]);

  /* =======================================================
     PRODUCT DATA
  ======================================================= */

  const productTitle = useMemo(() => {
    if (!item) {
      return "Inventory Item";
    }

    return (
      item.listing?.title ||
      displayValue(
        getProductValue(
          item,
          "item_type"
        ),
        "Untitled Item"
      )
    );
  }, [item]);

  const brand = item
    ? displayValue(
        getProductValue(
          item,
          "brand"
        ),
        "Unknown Brand"
      )
    : "";

  const model = item
    ? displayValue(
        getProductValue(
          item,
          "model"
        ),
        ""
      )
    : "";

  const itemType = item
    ? displayValue(
        getProductValue(
          item,
          "item_type"
        ),
        "Product"
      )
    : "";

  const primaryColour = item
    ? displayValue(
        getProductValue(
          item,
          "primary_colour"
        )
      )
    : "";

  const secondaryColour = item
    ? displayValue(
        getProductValue(
          item,
          "secondary_colour"
        )
      )
    : "";

  const gender = item
    ? displayValue(
        getProductValue(
          item,
          "gender"
        )
      )
    : "";

  const size = item
    ? displayValue(
        getItemSpecific(
          item,
          "size"
        )
      )
    : "";

  /* =======================================================
     CONDITION
  ======================================================= */

  const conditionData = item
    ? getConditionData(item)
    : null;

  const conditionOverall =
    displayValue(
      getObjectValue(
        conditionData,
        "overall"
      ),
      item?.condition ||
        "Used"
    );

  const conditionRating =
    getObjectValue(
      conditionData,
      "rating"
    );

  const conditionConfidence =
    getObjectValue(
      conditionData,
      "confidence"
    );

  const conditionDetails =
    getObjectValue(
      conditionData,
      "details"
    );

  const conditionDefects =
    getObjectValue(
      conditionData,
      "defects"
    );

  /* =======================================================
     SELLING DATA
  ======================================================= */

  const selling =
    item?.selling || {};

  const sellingPrice =
    getObjectValue(
      selling,
      "price"
    );

  const customPrice =
    getObjectValue(
      selling,
      "customPrice"
    );

  const actualSellingPrice =
    sellingPrice !== null &&
    sellingPrice !== undefined
      ? sellingPrice
      : customPrice;

  /* =======================================================
     CHANGE STATUS
  ======================================================= */

  async function changeStatus(
    status: InventoryStatus
  ): Promise<void> {
    if (
      !item ||
      savingStatus
    ) {
      return;
    }

    setSavingStatus(true);
    setError("");

    try {
      const updated =
        updateInventoryItem(
          item.id,
          { status }
        );

      if (!updated) {
        throw new Error(
          "The item could not be updated."
        );
      }

      setItem(updated);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update item."
      );
    } finally {
      setSavingStatus(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  function removeItem(): void {
    if (!item) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove "${productTitle}" from your inventory?\n\nThis cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      deleteInventoryItem(
        item.id
      );

      router.push(
        "/inventory"
      );
    } catch (err) {
      console.error(err);

      setError(
        "The item could not be removed."
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main
        className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5]`}
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />

          <p className="mt-4 text-sm text-zinc-500">
            Loading item...
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!item) {
    return (
      <main
        className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5] p-6`}
      >
        <div className="w-full max-w-lg rounded-[24px] border border-zinc-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-3xl text-zinc-400">
            ▧
          </div>

          <h1 className="mt-5 text-2xl font-bold">
            Item not found
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            This inventory item could not
            be found.
          </p>

          <Link
            href="/inventory"
            className="mt-6 inline-flex rounded-full bg-[#5540c8] px-6 py-3 text-sm font-semibold text-white"
          >
            ← Back to Inventory
          </Link>
        </div>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main
      className={`${lexend.className} min-h-screen bg-[#f4f4f5] pb-24 text-[#20202a] lg:pb-10`}
    >
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8">

        {/* HEADER */}

        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">

            <Link
              href="/inventory"
              className="text-sm font-semibold text-[#5540c8] hover:text-[#4936b5]"
            >
              ← Back to Inventory
            </Link>

            <div className="flex flex-wrap gap-2">

              <Link
                href="/add"
                className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                + Add Item
              </Link>

              <button
                type="button"
                onClick={removeItem}
                className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                Remove Item
              </button>

            </div>
          </div>

          <div className="mt-6">

            <div className="flex flex-wrap items-center gap-3">

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses(
                  item.status
                )}`}
              >
                {item.status}
              </span>

              <span className="text-xs text-zinc-400">
                Added{" "}
                {new Date(
                  item.createdAt
                ).toLocaleDateString(
                  "en-GB"
                )}
              </span>

            </div>

            <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">
              {productTitle}
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {brand}
              {model
                ? ` • ${model}`
                : ""}
            </p>

          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            TOP
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">

          {/* IMAGES */}

          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

            <div className="mb-4">

              <h2 className="text-lg font-bold">
                Product Photos
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                {item.imageCount || 0} photo
                {item.imageCount === 1
                  ? ""
                  : "s"}
              </p>

            </div>

            <ImageGallery
              item={item}
            />

          </section>

          {/* OVERVIEW */}

          <section className="rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

            <div className="flex flex-col justify-between gap-5 sm:flex-row">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">
                  Inventory Overview
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {productTitle}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  {item.category ||
                    "Uncategorised"}
                </p>

              </div>

              <div className="rounded-2xl bg-[#eeeafa] px-6 py-4 text-center">

                <p className="text-xs font-medium text-[#5945c7]">
                  Selling Price
                </p>

                <p className="mt-1 text-3xl font-bold text-[#5540c8]">
                  {money(
                    actualSellingPrice
                  )}
                </p>

              </div>

            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <InfoCard
                label="Purchase Price"
                value={money(
                  item.purchasePrice
                )}
              />

              <InfoCard
                label="Estimated Profit"
                value={money(
                  item.estimatedProfit
                )}
              />

              <InfoCard
                label="Estimated ROI"
                value={
                  item.estimatedROI ===
                  null
                    ? "N/A"
                    : `${item.estimatedROI.toFixed(
                        1
                      )}%`
                }
              />

              <InfoCard
                label="Quantity"
                value={`${Math.max(
                  0,
                  item.quantity -
                    item.quantitySold
                )} available`}
              />

            </div>

            {/* STATUS */}

            <div className="mt-6">

              <label className="text-sm font-semibold">
                Inventory Status
              </label>

              <select
                value={
                  item.status
                }
                disabled={
                  savingStatus
                }
                onChange={(event) =>
                  void changeStatus(
                    event.target
                      .value as InventoryStatus
                  )
                }
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm outline-none focus:border-[#5540c8] disabled:bg-zinc-100"
              >

                {statuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}

              </select>

              <p className="mt-2 text-xs text-zinc-400">
                Set this to{" "}
                <strong>
                  Listed
                </strong>{" "}
                when the item is live for
                sale.
              </p>

            </div>

          </section>

        </div>

        {/* =================================================
            LISTING
        ================================================= */}

        <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

          <h2 className="text-xl font-bold">
            Listing Information
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            The listing information generated
            for this item.
          </p>

          <div className="mt-6">

            <InfoCard
              label="Title"
              value={
                item.listing.title
              }
            />

            <div className="mt-4 rounded-2xl bg-zinc-50 p-5">

              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                Description
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                {item.listing.description ||
                  "No description saved."}
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            PRODUCT INFORMATION
        ================================================= */}

        <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

          <h2 className="text-xl font-bold">
            Product Information
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            Information Reseller AI identified
            about the item.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <InfoCard
              label="Brand"
              value={brand}
            />

            <InfoCard
              label="Model"
              value={model}
            />

            <InfoCard
              label="Item Type"
              value={itemType}
            />

            <InfoCard
              label="Category"
              value={item.category}
            />

            <InfoCard
              label="Primary Colour"
              value={primaryColour}
            />

            <InfoCard
              label="Secondary Colour"
              value={secondaryColour}
            />

            <InfoCard
              label="Gender"
              value={gender}
            />

            <InfoCard
              label="Size"
              value={size}
            />

            <InfoCard
              label="Condition"
              value={conditionOverall}
            />

          </div>

        </section>

        {/* =================================================
            CONDITION
        ================================================= */}

        <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

            <div>

              <h2 className="text-xl font-bold">
                Condition
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                Condition information from
                the AI analysis.
              </p>

            </div>

            <div className="rounded-2xl bg-zinc-50 px-5 py-3 text-center">

              <p className="text-sm font-bold">
                {conditionOverall}
              </p>

              {conditionRating !==
                undefined && (
                <p className="mt-1 text-xs text-zinc-400">
                  {displayValue(
                    conditionRating
                  )}
                  /100
                </p>
              )}

              {conditionConfidence !==
                undefined && (
                <p className="mt-1 text-xs text-zinc-400">
                  {(
                    Number(
                      conditionConfidence
                    ) * 100
                  ).toFixed(0)}
                  % confidence
                </p>
              )}

            </div>

          </div>

          {Array.isArray(
            conditionDetails
          ) &&
            conditionDetails.length >
              0 && (

              <div className="mt-6">

                <h3 className="font-semibold">
                  Condition Details
                </h3>

                <ul className="mt-3 space-y-2 text-sm text-zinc-600">

                  {conditionDetails.map(
                    (
                      detail,
                      index
                    ) => (
                      <li
                        key={`${String(
                          detail
                        )}-${index}`}
                      >
                        •{" "}
                        {String(
                          detail
                        )}
                      </li>
                    )
                  )}

                </ul>

              </div>
            )}

          {Array.isArray(
            conditionDefects
          ) &&
            conditionDefects.length >
              0 && (

              <div className="mt-6 rounded-2xl bg-red-50 p-5">

                <h3 className="font-semibold text-red-800">
                  Visible Issues
                </h3>

                <ul className="mt-3 space-y-2 text-sm text-red-700">

                  {conditionDefects.map(
                    (
                      defect,
                      index
                    ) => (
                      <li
                        key={`${String(
                          defect
                        )}-${index}`}
                      >
                        •{" "}
                        {String(
                          defect
                        )}
                      </li>
                    )
                  )}

                </ul>

              </div>
            )}

        </section>

        {/* =================================================
            FEATURES
        ================================================= */}

        {getFeatures(item).length >
          0 && (

          <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

            <h2 className="text-xl font-bold">
              Features
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">

              {getFeatures(item).map(
                (
                  feature,
                  index
                ) => (
                  <span
                    key={`${String(
                      feature
                    )}-${index}`}
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700"
                  >
                    {String(
                      feature
                    )}
                  </span>
                )
              )}

            </div>

          </section>
        )}

        {/* =================================================
            VISIBLE TEXT
        ================================================= */}

        {getVisibleText(item).length >
          0 && (

          <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

            <h2 className="text-xl font-bold">
              Visible Product Information
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">

              {getVisibleText(item).map(
                (
                  text,
                  index
                ) => (
                  <span
                    key={`${String(
                      text
                    )}-${index}`}
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm text-zinc-700"
                  >
                    {String(
                      text
                    )}
                  </span>
                )
              )}

            </div>

          </section>
        )}

        {/* =================================================
            ITEM SPECIFICS
        ================================================= */}

        {item.itemSpecifics &&
          Object.keys(
            item.itemSpecifics
          ).length > 0 && (

            <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

              <h2 className="text-xl font-bold">
                Item Specifics
              </h2>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {Object.entries(
                  item.itemSpecifics
                ).map(
                  ([key, value]) => (
                    <InfoCard
                      key={key}
                      label={key
                        .replace(
                          /([A-Z])/g,
                          " $1"
                        )
                        .replace(
                          /^./,
                          (letter) =>
                            letter.toUpperCase()
                        )}
                      value={value}
                    />
                  )
                )}

              </div>

            </section>
          )}

        {/* =================================================
            SELLING
        ================================================= */}

        <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

          <h2 className="text-xl font-bold">
            Selling Information
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <InfoCard
              label="Format"
              value={getObjectValue(
                selling,
                "format"
              )}
            />

            <InfoCard
              label="Selling Price"
              value={money(
                actualSellingPrice
              )}
            />

            <InfoCard
              label="Quantity"
              value={item.quantity}
            />

            <InfoCard
              label="Quantity Sold"
              value={item.quantitySold}
            />

            <InfoCard
              label="Purchase Price"
              value={money(
                item.purchasePrice
              )}
            />

            <InfoCard
              label="Estimated Profit"
              value={money(
                item.estimatedProfit
              )}
            />

            <InfoCard
              label="Estimated ROI"
              value={
                item.estimatedROI ===
                null
                  ? "N/A"
                  : `${item.estimatedROI.toFixed(
                      1
                    )}%`
              }
            />

          </div>

        </section>

        {/* =================================================
            SHIPPING
        ================================================= */}

        {item.shipping && (

          <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

            <h2 className="text-xl font-bold">
              Shipping
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <InfoCard
                label="Paid By"
                value={getObjectValue(
                  item.shipping,
                  "paidBy"
                )}
              />

              <InfoCard
                label="Shipping Price"
                value={money(
                  getObjectValue(
                    item.shipping,
                    "price"
                  )
                )}
              />

              <InfoCard
                label="Service"
                value={getObjectValue(
                  item.shipping,
                  "service"
                )}
              />

              <InfoCard
                label="Parcel Size"
                value={getObjectValue(
                  item.shipping,
                  "parcelSize"
                )}
              />

              <InfoCard
                label="Weight"
                value={
                  getObjectValue(
                    item.shipping,
                    "weight"
                  ) !== undefined
                    ? `${displayValue(
                        getObjectValue(
                          item.shipping,
                          "weight"
                        )
                      )} kg`
                    : undefined
                }
              />

            </div>

          </section>
        )}

        {/* =================================================
            PACKAGING
        ================================================= */}

        <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

          <h2 className="text-xl font-bold">
            Packaging & Dispatch
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <InfoCard
              label="Dispatch"
              value={item.dispatch}
            />

            <InfoCard
              label="Packaging Type"
              value={getObjectValue(
                item.packaging,
                "type"
              )}
            />

            <InfoCard
              label="Packaging Condition"
              value={getObjectValue(
                item.packaging,
                "condition"
              )}
            />

            <InfoCard
              label="Seller Status"
              value={
                item.sellerStatus
              }
            />

          </div>

          {item.additionalNotes && (
            <div className="mt-4 rounded-2xl bg-zinc-50 p-5">

              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
                Additional Notes
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {item.additionalNotes}
              </p>

            </div>
          )}

        </section>

        {/* =================================================
            RETURNS
        ================================================= */}

        {item.returns && (

          <section className="mt-6 rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">

            <h2 className="text-xl font-bold">
              Returns
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              <InfoCard
                label="Returns Accepted"
                value={
                  getObjectValue(
                    item.returns,
                    "accepted"
                  )
                    ? "Yes"
                    : "No"
                }
              />

              <InfoCard
                label="Return Period"
                value={
                  getObjectValue(
                    item.returns,
                    "period"
                  ) != null
                    ? `${displayValue(
                        getObjectValue(
                          item.returns,
                          "period"
                        )
                      )} days`
                    : "N/A"
                }
              />

              <InfoCard
                label="Return Postage"
                value={getObjectValue(
                  item.returns,
                  "postage"
                )}
              />

            </div>

          </section>
        )}

        {/* =================================================
            SALE INFORMATION
        ================================================= */}

        {(item.status ===
          "Sold" ||
          item.soldPrice !== null ||
          item.soldAt !== null) && (

          <section className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">

            <h2 className="text-xl font-bold text-emerald-900">
              Sale Information
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <div className="rounded-2xl bg-white p-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-600">
                  Sold Price
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {money(
                    item.soldPrice
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-white p-4">

                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-600">
                  Sold At
                </p>

                <p className="mt-1 font-semibold text-emerald-900">
                  {item.soldAt
                    ? new Date(
                        item.soldAt
                      ).toLocaleString(
                        "en-GB"
                      )
                    : "Not recorded"}
                </p>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            BOTTOM
        ================================================= */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">

          <Link
            href="/inventory"
            className="rounded-full border border-zinc-200 bg-white px-6 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            ← Back to Inventory
          </Link>

          {item.status ===
            "Listed" && (

            <Link
              href="/listings"
              className="rounded-full bg-[#5540c8] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#4936b5]"
            >
              View in Listings →
            </Link>

          )}

        </div>

        <p className="mt-8 pb-8 text-center text-xs text-zinc-400">
          Reseller AI • Inventory
        </p>

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
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-[10px] font-semibold ${
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