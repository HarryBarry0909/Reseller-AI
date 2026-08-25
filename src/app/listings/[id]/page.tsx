"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Lexend } from "next/font/google";
import {
  deleteListing,
  getImageSet,
  getListing,
  updateListing,
  type ListingRecord,
} from "../../../lib/listing-store";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

const statuses = [
  "Draft",
  "Ready to List",
  "Listed",
  "Sold",
  "Unsold",
  "Cancelled",
] as const;

function money(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "—" : `£${value.toFixed(2)}`;
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const [listing, setListing] = useState<ListingRecord | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState<ListingRecord["status"]>("Draft");
  const [soldPrice, setSoldPrice] = useState("");
  const [quantitySold, setQuantitySold] = useState("0");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const item = getListing(params.id);
    if (!item) return;

    setListing(item);
    setStatus(item.status === "Removed" ? "Draft" : item.status);
    setSoldPrice(item.soldPrice == null ? "" : String(item.soldPrice));
    setQuantitySold(String(item.quantitySold || 0));

    let alive = true;
    const objectUrls: string[] = [];

    (async () => {
      if (!item.imageSetId) return;
      const blobs = await getImageSet(item.imageSetId, item.imageCount);
      if (!alive) return;

      const urls = blobs.map((blob) => {
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        return url;
      });

      setImages(urls);
    })();

    return () => {
      alive = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [params.id]);

  const price = listing
    ? Number(listing.selling?.price ?? listing.selling?.customPrice ?? 0)
    : 0;
  const purchase = listing?.purchasePrice ?? 0;
  const actualSale = Number(soldPrice || 0);
  const soldQty = Math.max(0, Number(quantitySold) || 0);
  const revenue = status === "Sold" ? actualSale * soldQty : price;
  const profit =
    status === "Sold"
      ? (actualSale - purchase) * soldQty
      : price - purchase;
  const roi = purchase > 0 ? (profit / (purchase * (status === "Sold" ? Math.max(1, soldQty) : 1))) * 100 : null;

  const saveChanges = () => {
    if (!listing) return;

    const boundedQuantity = Math.min(
      Number(listing.quantity || 0),
      Math.max(0, Number(quantitySold) || 0)
    );

    const updated = updateListing(listing.id, {
      status,
      soldPrice: status === "Sold" ? actualSale : null,
      soldAt:
        status === "Sold"
          ? listing.soldAt || new Date().toISOString()
          : null,
      quantitySold: boundedQuantity,
      estimatedProfit: profit,
      estimatedROI: roi,
    });

    if (updated) setListing(updated);

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const removeCompletely = () => {
    if (!listing) return;

    const confirmed = window.confirm(
      `Remove "${listing.listing.title}" completely?\n\nThis permanently deletes the listing and its stored images from this browser.`
    );

    if (!confirmed) return;

    deleteListing(listing.id);
    router.push("/listings");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.alert("Copy failed. Please select the text manually.");
    }
  };

  if (!listing) {
    return (
      <main className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5] p-6`}>
        <div className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            !
          </div>
          <h1 className="mt-5 text-xl font-semibold">Listing not found</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This listing may have been removed.
          </p>
          <Link
            href="/listings"
            className="mt-6 inline-flex rounded-full bg-[#5540c8] px-5 py-3 text-sm font-semibold text-white"
          >
            ← Back to Listings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`${lexend.className} min-h-screen bg-[#f4f4f5] text-[#20202a]`}>
      <header className="border-b border-zinc-200/70 bg-white">
        <div className="flex min-h-[88px] items-center justify-between gap-4 px-5 sm:px-8 xl:px-10">
          <div>
            <Link
              href="/listings"
              className="text-xs font-semibold text-[#5b47cc]"
            >
              ← Listings
            </Link>
            <h1 className="mt-2 max-w-3xl truncate text-xl font-semibold sm:text-2xl">
              {listing.listing.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={removeCompletely}
            className="rounded-full border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            Remove Listing
          </button>
        </div>
      </header>

      <div className="p-5 sm:p-8 xl:p-10">
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <section className="rounded-[24px] border border-zinc-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Photos</h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    Stored compressed listing images
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-bold text-zinc-500">
                  {images.length} photo{images.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.length ? (
                  images.map((src, index) => (
                    <div
                      key={src}
                      className={`overflow-hidden rounded-[18px] bg-zinc-100 ${
                        index === 0 ? "col-span-2 aspect-[4/3] sm:col-span-2" : "aspect-square"
                      }`}
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex min-h-48 items-center justify-center rounded-[18px] bg-zinc-50 text-sm text-zinc-400">
                    No stored photos
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-zinc-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
              <SectionHeading
                title="Listing"
                subtitle="Your AI-generated eBay content"
              />

              <CopyField label="Title" value={listing.listing.title} onCopy={copy} />

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => copy(listing.listing.description)}
                    className="rounded-full bg-[#f1effb] px-3 py-1.5 text-[10px] font-bold text-[#5945c7] hover:bg-[#e9e5fb]"
                  >
                    Copy Description
                  </button>
                </div>

                <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-zinc-50 p-5 text-sm leading-7 text-zinc-600">
                  {listing.listing.description}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-zinc-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
              <SectionHeading
                title="Item Specifics"
                subtitle="Information detected by Reseller AI"
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Brand" value={listing.product?.brand} />
                <Info label="Model" value={listing.product?.model} />
                <Info label="Category" value={listing.category} />
                <Info label="Condition" value={listing.condition} />
                <Info label="Primary Colour" value={listing.product?.primary_colour} />
                <Info label="Secondary Colour" value={listing.product?.secondary_colour} />
                <Info label="Gender" value={listing.product?.gender} />
                <Info label="Size UK" value={listing.product?.size?.uk} />
                <Info label="Size US" value={listing.product?.size?.us} />
                <Info label="Size EU" value={listing.product?.size?.eu} />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-[24px] bg-[#24232c] p-6 text-white shadow-[0_8px_30px_rgba(30,28,40,0.12)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                    Listing status
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Selling Information</h2>
                </div>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/70">
                  {listing.marketplace}
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as ListingRecord["status"])
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white outline-none focus:border-white/30"
                  >
                    {statuses.map((value) => (
                      <option key={value} value={value} className="text-black">
                        {value}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantity Sold">
                  <input
                    type="number"
                    min="0"
                    max={listing.quantity}
                    value={quantitySold}
                    onChange={(e) => setQuantitySold(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white outline-none"
                  />
                </Field>

                <Field label="Sold Price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    disabled={status !== "Sold"}
                    className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    placeholder="£0.00"
                  />
                </Field>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DarkMetric label="Revenue" value={money(revenue)} />
                <DarkMetric label="Profit" value={money(profit)} />
                <DarkMetric label="ROI" value={roi == null ? "N/A" : `${roi.toFixed(1)}%`} />
              </div>

              <button
                type="button"
                onClick={saveChanges}
                className="mt-5 w-full rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#24232c] transition hover:bg-zinc-100"
              >
                {saved ? "✓ Changes Saved" : "Save Changes"}
              </button>
            </section>

            <section className="rounded-[24px] border border-zinc-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
              <SectionHeading title="Financial Overview" subtitle="Current item economics" />

              <div className="space-y-3">
                <InfoRow label="Purchase price" value={money(purchase)} />
                <InfoRow label="Target selling price" value={money(price)} />
                <InfoRow label="Potential profit" value={money(price - purchase)} />
                <InfoRow
                  label="Potential ROI"
                  value={purchase > 0 ? `${(((price - purchase) / purchase) * 100).toFixed(1)}%` : "N/A"}
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-zinc-200/80 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.025)]">
              <SectionHeading title="Fulfilment" subtitle="Listing configuration" />
              <div className="space-y-3">
                <InfoRow label="Dispatch" value={listing.dispatch || "Not set"} />
                <InfoRow label="Packaging" value={listing.packaging?.type || "Not set"} />
                <InfoRow
                  label="Shipping"
                  value={
                    listing.shipping?.paidBy === "BUYER"
                      ? `Buyer pays ${money(Number(listing.shipping?.price || 0))}`
                      : "Seller pays"
                  }
                />
                <InfoRow
                  label="Parcel"
                  value={listing.shipping?.parcelSize || "Not set"}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
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
                    : "text-zinc-400 hover:bg-zinc-100"
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

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
    </div>
  );
}

function CopyField({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400">
          {label}
        </label>
        <button
          type="button"
          onClick={() => onCopy(value)}
          className="rounded-full bg-[#f1effb] px-3 py-1.5 text-[10px] font-bold text-[#5945c7] hover:bg-[#e9e5fb]"
        >
          Copy
        </button>
      </div>
      <div className="mt-2 rounded-2xl bg-zinc-50 p-4 text-sm font-medium text-zinc-700">
        {value}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-700">
        {value || "Unknown"}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-zinc-50 px-4 py-3">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-right text-xs font-semibold text-zinc-700">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-[10px] font-medium text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}