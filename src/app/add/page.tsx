"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addInventoryItem,
  createInventoryId,
  type InventoryItem,
} from "@/lib/inventory-store";


type SizeData = {
  detected_value: string;
  detected_system: string;
  uk: string;
  us: string;
  eu: string;
  confidence: number;
};


type ConditionData = {
  overall: string;
  rating: number;
  confidence: number;
  details: string[];
  defects: string[];
};


type ProductData = {
  brand: string;
  brand_confidence: number;

  item_type: string;
  item_type_confidence: number;

  category: string;

  model: string;
  model_confidence: number;

  primary_colour: string;
  secondary_colour: string;
  colour_confidence: number;

  gender: string;

  size: SizeData;

  visible_text: string[];

  features: string[];

  condition: ConditionData;

  overall_confidence: number;
};


type Pricing = {
  market_estimate: number;
  quick_sale: number;
  normal_sale: number;
  slow_sale: number;
  recommended: number;

  estimated_sale_time: string;

  reasoning: string;

  profit_quick: number | null;
  profit_normal: number | null;
  profit_slow: number | null;

  roi_quick: number | null;
  roi_normal: number | null;
  roi_slow: number | null;

  verdict: string;
};


type Listing = {
  title: string;
  description: string;
};


type AIResult = {
  success: boolean;
  version: string;
  photosAnalysed: number;

  product: ProductData;

  listing: Listing;

  pricing: Pricing;
};


export default function AddItem() {

  const router = useRouter();


  // ---------------------------------------
  // PHOTOS
  // ---------------------------------------

  const [photos, setPhotos] =
    useState<File[]>([]);

  const [previews, setPreviews] =
    useState<string[]>([]);


  // ---------------------------------------
  // PURCHASE PRICE
  // ---------------------------------------

  const [purchasePrice, setPurchasePrice] =
    useState("");


  // ---------------------------------------
  // SELLER CONFIGURATION
  // ---------------------------------------

  const [dispatchTime, setDispatchTime] =
    useState("24hrs");

  const [packagingType, setPackagingType] =
    useState("Box");

  const [packagingCondition, setPackagingCondition] =
    useState("New / Good Condition");

  const [itemStatus, setItemStatus] =
    useState("Ready to Ship");

  const [additionalNotes, setAdditionalNotes] =
    useState("");


  // ---------------------------------------
  // AI
  // ---------------------------------------

  const [isAnalysing, setIsAnalysing] =
    useState(false);

  const [result, setResult] =
    useState<AIResult | null>(null);

  const [error, setError] =
    useState("");


  // ---------------------------------------
  // PHOTO HANDLING
  // ---------------------------------------

  function handlePhotos(
    event: React.ChangeEvent<HTMLInputElement>
  ) {

    if (!event.target.files) {
      return;
    }


    const selected =
      Array.from(event.target.files);


    setPhotos(
      current =>
        [
          ...current,
          ...selected,
        ].slice(0, 5)
    );


    setError("");
  }


  function removePhoto(
    index: number
  ) {

    setPhotos(
      current =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );
  }


  // ---------------------------------------
  // IMAGE PREPARATION
  // ---------------------------------------



  // ---------------------------------------
  // AI ANALYSIS
  // ---------------------------------------

  async function analyseItem() {

    if (!photos.length) {

      setError(
        "Please add at least one photo."
      );

      return;
    }


    setIsAnalysing(true);

    setResult(null);

    setError("");


    try {

      const supabase = createClient();

      // Upload the original photos directly to Supabase Storage.
      // This keeps large iPhone camera files out of the Vercel request body.
      const imageUrls: string[] = [];

      for (const photo of photos) {
        const extension =
          photo.name.split(".").pop()?.toLowerCase() ||
          (photo.type === "image/png" ? "png" : "jpg");

        const safeExtension =
          ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension)
            ? extension
            : "jpg";

        const filePath =
          `analysis/${crypto.randomUUID()}.${safeExtension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("listing-images")
            .upload(filePath, photo, {
              cacheControl: "3600",
              upsert: false,
              contentType: photo.type || "image/jpeg",
            });

        if (uploadError) {
          throw new Error(
            `Photo upload failed: ${uploadError.message}`
          );
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      // Only small JSON metadata and image URLs go through Vercel.
      const apiUrl =
        new URL(
          "/api/analyse",
          window.location.origin
        ).toString();

      const response =
        await fetch(
          apiUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_urls: imageUrls,
              purchase_price: purchasePrice || "0",
              dispatch_time: dispatchTime,
              packaging_type: packagingType,
              packaging_condition: packagingCondition,
              item_status: itemStatus,
              additional_notes: additionalNotes,
            }),
            cache: "no-store",
          }
        );

      const responseText =
        await response.text();

      let data: any;

      try {
        data =
          responseText
            ? JSON.parse(responseText)
            : null;
      } catch {
        throw new Error(
          `Analysis server returned an invalid response (${response.status}).`
        );
      }

      if (!data) {
        throw new Error(
          `Analysis server returned no response (${response.status}).`
        );
      }


      console.log(
        "RESELLER AI RESPONSE:",
        data
      );


      if (!response.ok) {

        throw new Error(
          data.error ||
          `Server error ${response.status}`
        );

      }


      if (!data.success) {

        throw new Error(
          data.error ||
          "AI analysis failed."
        );

      }


      setResult(data);


    } catch (err) {

      console.error(err);


      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );


    } finally {

      setIsAnalysing(false);

    }

  }


  // ---------------------------------------
  // IMAGE PREVIEWS
  // ---------------------------------------

  useEffect(() => {

    const urls =
      photos.map(
        photo =>
          URL.createObjectURL(
            photo
          )
      );


    setPreviews(urls);


    return () => {

      urls.forEach(
        url =>
          URL.revokeObjectURL(
            url
          )
      );

    };

  }, [photos]);


  // ---------------------------------------
  // MONEY
  // ---------------------------------------

  function money(
    value: number | null
  ) {

    if (
      value === null ||
      !Number.isFinite(value)
    ) {

      return "N/A";

    }


    return `£${value.toFixed(2)}`;

  }


  // ---------------------------------------
  // PERCENTAGE
  // ---------------------------------------

  function percent(
    value: number
  ) {

    return `${Math.round(
      value * 100
    )}%`;

  }


  // ---------------------------------------
  // CONFIDENCE COLOUR
  // ---------------------------------------

  function confidenceClass(
    value: number
  ) {

    if (value >= 0.8) {

      return "text-green-600";

    }


    if (value >= 0.5) {

      return "text-yellow-600";

    }


    return "text-red-600";

  }


  // ---------------------------------------
  // GO TO ITEM SPECIFICS
  // ---------------------------------------

  async function goToItemSpecifics() {
    if (!result) {
      return;
    }

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to save an inventory item.");
        return;
      }

      const existingId =
        sessionStorage.getItem("reseller_ai_inventory_id");

      // Don't create the same inventory item twice if the button is
      // accidentally pressed more than once.
      const inventoryId =
        existingId || createInventoryId();

      const purchase =
        Number(purchasePrice || 0);

      const recommended =
        Number(result.pricing.recommended || 0);

      const estimatedProfit =
        recommended - purchase;

      const estimatedROI =
        purchase > 0
          ? (estimatedProfit / purchase) * 100
          : null;

      const now =
        new Date().toISOString();

      const inventoryItem: InventoryItem = {
        id: inventoryId,
        userId: user.id,

        createdAt: now,
        updatedAt: now,

        status: "Draft",

        imageSetId: null,
        imageCount: result.photosAnalysed,

        product: {
          ...result.product,
        },

        listing: {
          title: result.listing.title,
          description: result.listing.description,
        },

        category:
          result.product.category || null,

        condition:
          result.product.condition?.overall || null,

        itemSpecifics: {},

        selling: {
          marketplace: "eBay",
          price: recommended,
          recommendedPrice: recommended,
        },

        shipping: {},

        dispatch: dispatchTime,

        packaging: {
          type: packagingType,
          condition: packagingCondition,
        },

        sellerStatus: itemStatus,
        additionalNotes:
          additionalNotes || null,

        purchasePrice: purchase,

        estimatedProfit,

        estimatedROI,

        quantity: 1,
        quantitySold: 0,

        soldPrice: null,
        soldAt: null,
      };

      if (!existingId) {
        addInventoryItem(inventoryItem);

        sessionStorage.setItem(
          "reseller_ai_inventory_id",
          inventoryId
        );
      }

      sessionStorage.setItem(
        "reseller_ai_result",
        JSON.stringify(result)
      );

      sessionStorage.setItem(
        "reseller_ai_config",
        JSON.stringify({
          dispatchTime,
          packagingType,
          packagingCondition,
          itemStatus,
          additionalNotes,
          purchasePrice,
        })
      );

      router.push("/specifics");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not create the inventory item."
      );
    }
  }

  // ---------------------------------------
  // RESET
  // ---------------------------------------

  function analyseAnotherItem() {

    setResult(null);

    setPhotos([]);

    setPreviews([]);

    setPurchasePrice("");

    setError("");

    sessionStorage.removeItem(
      "reseller_ai_inventory_id"
    );

    setDispatchTime("24hrs");

    setPackagingType("Box");

    setPackagingCondition(
      "New / Good Condition"
    );

    setItemStatus("Ready to Ship");

    setAdditionalNotes("");

  }


  // ---------------------------------------
  // PAGE
  // ---------------------------------------

  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">


        {/* HEADER */}

        <div className="mb-8">

          <a
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Back to Dashboard
          </a>


          <h1 className="mt-5 text-3xl font-bold">
            Add Item
          </h1>


          <p className="mt-1 text-zinc-500">
            Photograph your item and let Reseller AI
            identify, list and price it.
          </p>

        </div>


        {/* PHOTOS */}

        <section className="rounded-2xl border bg-white p-6">

          <div className="flex justify-between">

            <div>

              <h2 className="text-lg font-semibold">
                Product Photos
              </h2>


              <p className="text-sm text-zinc-500">
                Add up to 5 photos.
              </p>

            </div>


            <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs">

              {photos.length}/5

            </div>

          </div>


          {!result &&
            photos.length < 5 && (

              <label className="mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100">

                <div className="text-4xl">
                  📸
                </div>


                <p className="mt-3 font-semibold">
                  Add product photos
                </p>


                <p className="text-sm text-zinc-500">
                  Include labels, size tags and
                  any visible defects.
                </p>


                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={
                    handlePhotos
                  }
                />

              </label>

            )}


          {photos.length > 0 && (

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">

              {photos.map(
                (photo, index) => (

                  <div
                    key={`${photo.name}-${index}`}
                    className="group relative overflow-hidden rounded-xl border"
                  >

                    {previews[index] && (

                      <img
                        src={
                          previews[index]
                        }
                        alt={`Product ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />

                    )}


                    <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white">

                      #{index + 1}

                    </div>


                    {!result && (

                      <button
                        type="button"
                        onClick={() =>
                          removePhoto(
                            index
                          )
                        }
                        className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-white"
                      >
                        ×
                      </button>

                    )}

                  </div>

                )
              )}

            </div>

          )}

        </section>


        {/* PURCHASE PRICE */}

        <section className="mt-6 rounded-2xl border bg-white p-6">

          <h2 className="font-semibold">
            Purchase Price
          </h2>


          <div className="mt-3 flex max-w-sm items-center rounded-xl border px-4">

            <span className="text-zinc-500">
              £
            </span>


            <input
              type="number"
              min="0"
              step="0.01"
              value={
                purchasePrice
              }
              onChange={
                event =>
                  setPurchasePrice(
                    event.target.value
                  )
              }
              placeholder="0.00"
              className="w-full px-3 py-3 outline-none"
            />

          </div>

        </section>


        {/* SELLER CONFIGURATION */}

        {!result && (

          <section className="mt-6 rounded-2xl border bg-white p-6">

            <div>

              <h2 className="text-xl font-bold">
                Listing Configuration
              </h2>


              <p className="mt-1 text-sm text-zinc-500">
                These settings will be carried over
                to the Item Specifics page.
              </p>

            </div>


            <div className="mt-6 grid gap-5 md:grid-cols-2">


              {/* DISPATCH */}

              <div>

                <label className="text-sm font-semibold">
                  Estimated Dispatch
                </label>


                <select
                  value={
                    dispatchTime
                  }
                  onChange={
                    event =>
                      setDispatchTime(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border bg-white p-3 outline-none focus:border-zinc-900"
                >

                  <option value="24hrs">
                    24hrs
                  </option>

                  <option value="48hrs">
                    48hrs
                  </option>

                  <option value="3-5 days">
                    3-5 days
                  </option>

                  <option value="5 days or more">
                    5 days or more
                  </option>

                </select>

              </div>


              {/* PACKAGING */}

              <div>

                <label className="text-sm font-semibold">
                  Packaging Type
                </label>


                <select
                  value={
                    packagingType
                  }
                  onChange={
                    event =>
                      setPackagingType(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border bg-white p-3 outline-none focus:border-zinc-900"
                >

                  <option value="Box">
                    Box
                  </option>

                  <option value="Poly Mailer">
                    Poly Mailer
                  </option>

                  <option value="Padded Envelope">
                    Padded Envelope
                  </option>

                  <option value="Cardboard Envelope">
                    Cardboard Envelope
                  </option>

                  <option value="Bubble Wrap">
                    Bubble Wrap
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>


              {/* PACKAGING CONDITION */}

              <div>

                <label className="text-sm font-semibold">
                  Packaging Condition
                </label>


                <select
                  value={
                    packagingCondition
                  }
                  onChange={
                    event =>
                      setPackagingCondition(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border bg-white p-3 outline-none focus:border-zinc-900"
                >

                  <option value="New / Good Condition">
                    New / Good Condition
                  </option>

                  <option value="Used / Reused">
                    Used / Reused
                  </option>

                  <option value="Minimal Packaging">
                    Minimal Packaging
                  </option>

                </select>

              </div>


              {/* ITEM STATUS */}

              <div>

                <label className="text-sm font-semibold">
                  Item Status
                </label>


                <select
                  value={
                    itemStatus
                  }
                  onChange={
                    event =>
                      setItemStatus(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border bg-white p-3 outline-none focus:border-zinc-900"
                >

                  <option value="Ready to Ship">
                    Ready to Ship
                  </option>

                  <option value="Needs Cleaning">
                    Needs Cleaning
                  </option>

                  <option value="Needs Testing">
                    Needs Testing
                  </option>

                  <option value="Needs Repair">
                    Needs Repair
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>

            </div>


            {/* ADDITIONAL NOTES */}

            <div className="mt-5">

              <label className="text-sm font-semibold">
                Additional Notes
              </label>


              <textarea
                value={
                  additionalNotes
                }
                onChange={
                  event =>
                    setAdditionalNotes(
                      event.target.value
                    )
                }
                placeholder="Anything else you want to remember about this item..."
                className="mt-2 min-h-28 w-full rounded-xl border p-4 text-sm outline-none focus:border-zinc-900"
              />

            </div>

          </section>

        )}


        {/* ERROR */}

        {error && (

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">

            <strong>
              Analysis failed
            </strong>


            <p className="mt-1 text-sm">
              {error}
            </p>

          </div>

        )}


        {/* LOADING */}

        {isAnalysing && (

          <section className="mt-6 rounded-2xl bg-zinc-900 p-10 text-center text-white">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-600 border-t-white" />


            <h2 className="mt-6 text-2xl font-bold">
              Reseller AI is analysing...
            </h2>


            <p className="mt-2 text-zinc-400">
              Analysing {photos.length} photo
              {photos.length === 1 ? "" : "s"} together.
            </p>

          </section>

        )}


        {/* RESULTS */}

        {result && (

          <div className="mt-6 space-y-6">


            {/* IDENTIFICATION */}

            <section className="rounded-2xl border bg-white p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-2xl font-bold">
                    Product Identification
                  </h2>


                  <p className="text-sm text-zinc-500">
                    {result.photosAnalysed} photos analysed
                  </p>

                </div>


                <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">

                  {percent(
                    result.product
                      .overall_confidence
                  )}

                  {" "}confidence

                </div>

              </div>


              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {[
                  [
                    "Brand",
                    result.product.brand,
                    result.product.brand_confidence,
                  ],

                  [
                    "Item",
                    result.product.item_type,
                    result.product.item_type_confidence,
                  ],

                  [
                    "Model",
                    result.product.model,
                    result.product.model_confidence,
                  ],

                  [
                    "Primary Colour",
                    result.product.primary_colour,
                    result.product.colour_confidence,
                  ],

                  [
                    "Secondary Colour",
                    result.product.secondary_colour,
                    result.product.colour_confidence,
                  ],

                  [
                    "Category",
                    result.product.category,
                    null,
                  ],

                  [
                    "Gender",
                    result.product.gender,
                    null,
                  ],

                ].map(
                  ([label, value, confidence]) => (

                    <div
                      key={
                        label as string
                      }
                      className="rounded-xl bg-zinc-50 p-4"
                    >

                      <p className="text-xs uppercase text-zinc-400">
                        {label}
                      </p>


                      <p className="mt-1 font-semibold">
                        {value as string}
                      </p>


                      {typeof confidence ===
                        "number" && (

                        <p
                          className={`mt-1 text-xs ${confidenceClass(
                            confidence
                          )}`}
                        >
                          {percent(
                            confidence
                          )} confidence
                        </p>

                      )}

                    </div>

                  )
                )}

              </div>

            </section>


            {/* SIZE */}

            <section className="rounded-2xl border bg-white p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-xl font-bold">
                    Size Conversion
                  </h2>


                  <p className="text-sm text-zinc-500">
                    Reseller AI detected the original
                    size system and converted it.
                  </p>

                </div>


                <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs">

                  {percent(
                    result.product.size.confidence
                  )}

                  {" "}confidence

                </div>

              </div>


              <div className="mt-5 grid gap-4 md:grid-cols-4">

                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="text-xs uppercase text-zinc-400">
                    Detected
                  </p>


                  <p className="mt-1 text-xl font-bold">
                    {
                      result.product.size
                        .detected_value
                    }
                  </p>


                  <p className="text-sm text-zinc-500">
                    {
                      result.product.size
                        .detected_system
                    }
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="text-xs uppercase text-zinc-400">
                    🇬🇧 UK
                  </p>


                  <p className="mt-1 text-xl font-bold">
                    {
                      result.product.size.uk
                    }
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="text-xs uppercase text-zinc-400">
                    🇺🇸 US
                  </p>


                  <p className="mt-1 text-xl font-bold">
                    {
                      result.product.size.us
                    }
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="text-xs uppercase text-zinc-400">
                    🇪🇺 EU
                  </p>


                  <p className="mt-1 text-xl font-bold">
                    {
                      result.product.size.eu
                    }
                  </p>

                </div>

              </div>

            </section>


            {/* CONDITION */}

            <section className="rounded-2xl border bg-white p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-xl font-bold">
                    Condition
                  </h2>


                  <p className="text-sm text-zinc-500">
                    Based on visible evidence in
                    the photographs.
                  </p>

                </div>


                <div className="text-right">

                  <p className="text-xl font-bold">
                    {
                      result.product.condition
                        .overall
                    }
                  </p>


                  <p className="text-sm text-zinc-500">
                    {
                      result.product.condition
                        .rating
                    }/100
                  </p>


                  <p
                    className={`text-xs ${confidenceClass(
                      result.product.condition.confidence
                    )}`}
                  >

                    {percent(
                      result.product.condition.confidence
                    )} confidence

                  </p>

                </div>

              </div>


              {result.product.condition.details.length >
                0 && (

                <div className="mt-5">

                  <p className="font-semibold">
                    Condition details
                  </p>


                  <ul className="mt-2 space-y-1 text-sm">

                    {result.product.condition.details.map(
                      item => (

                        <li key={item}>
                          • {item}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              )}


              {result.product.condition.defects.length >
                0 && (

                <div className="mt-5 rounded-xl bg-red-50 p-4">

                  <p className="font-semibold text-red-800">
                    Visible issues
                  </p>


                  <ul className="mt-2 space-y-1 text-sm text-red-700">

                    {result.product.condition.defects.map(
                      item => (

                        <li key={item}>
                          • {item}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              )}

            </section>


            {/* EBAY LISTING */}

            <section className="rounded-2xl border bg-white p-6">

              <h2 className="text-2xl font-bold">
                eBay Listing
              </h2>


              <div className="mt-5">

                <label className="text-sm font-semibold">
                  SEO Optimised Title
                </label>


                <input
                  value={
                    result.listing.title
                  }
                  readOnly
                  className="mt-2 w-full rounded-xl border bg-zinc-50 p-4 font-medium outline-none"
                />


                <div className="mt-2 flex justify-between text-xs text-zinc-400">

                  <span>
                    Optimised for eBay search
                  </span>


                  <span>
                    {
                      result.listing.title.length
                    } / 80 characters
                  </span>

                </div>

              </div>


              <div className="mt-6">

                <label className="text-sm font-semibold">
                  SEO Optimised Description
                </label>


                <textarea
                  defaultValue={
                    result.listing.description
                  }
                  className="mt-2 min-h-96 w-full rounded-xl border p-4 text-sm leading-7 outline-none focus:border-zinc-900"
                />

              </div>

            </section>


            {/* PRICING */}

            <section className="rounded-2xl border bg-white p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-2xl font-bold">
                    Pricing Analysis
                  </h2>


                  <p className="text-sm text-zinc-500">
                    Prototype estimate — live
                    marketplace data will be added later.
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-100 px-4 py-2 text-center">

                  <p className="text-xs text-zinc-500">
                    Recommended
                  </p>


                  <p className="text-xl font-bold">
                    {money(
                      result.pricing
                        .recommended
                    )}
                  </p>

                </div>

              </div>


              <div className="mt-6 grid gap-4 md:grid-cols-3">


                {/* QUICK */}

                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="font-semibold">
                    ⚡ Quick Sale
                  </p>


                  <p className="mt-2 text-3xl font-bold">
                    {money(
                      result.pricing
                        .quick_sale
                    )}
                  </p>


                  <p className="mt-1 text-sm text-zinc-500">
                    Prioritise speed
                  </p>


                  <p className="mt-4 text-sm">

                    Profit:{" "}

                    <strong>
                      {money(
                        result.pricing
                          .profit_quick
                      )}
                    </strong>

                  </p>


                  <p className="text-sm">

                    ROI:{" "}

                    <strong>
                      {result.pricing.roi_quick !==
                      null
                        ? `${result.pricing.roi_quick}%`
                        : "N/A"}
                    </strong>

                  </p>

                </div>


                {/* NORMAL */}

                <div className="rounded-xl border-2 border-zinc-900 p-5">

                  <p className="font-semibold">
                    🎯 Normal Sale
                  </p>


                  <p className="mt-2 text-3xl font-bold">
                    {money(
                      result.pricing
                        .normal_sale
                    )}
                  </p>


                  <p className="mt-1 text-sm text-zinc-500">
                    Recommended balance
                  </p>


                  <p className="mt-4 text-sm">

                    Profit:{" "}

                    <strong>
                      {money(
                        result.pricing
                          .profit_normal
                      )}
                    </strong>

                  </p>


                  <p className="text-sm">

                    ROI:{" "}

                    <strong>
                      {result.pricing.roi_normal !==
                      null
                        ? `${result.pricing.roi_normal}%`
                        : "N/A"}
                    </strong>

                  </p>

                </div>


                {/* SLOW */}

                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="font-semibold">
                    🐢 Slow Sale
                  </p>


                  <p className="mt-2 text-3xl font-bold">
                    {money(
                      result.pricing
                        .slow_sale
                    )}
                  </p>


                  <p className="mt-1 text-sm text-zinc-500">
                    Higher asking price
                  </p>


                  <p className="mt-4 text-sm">

                    Profit:{" "}

                    <strong>
                      {money(
                        result.pricing
                          .profit_slow
                      )}
                    </strong>

                  </p>


                  <p className="text-sm">

                    ROI:{" "}

                    <strong>
                      {result.pricing.roi_slow !==
                      null
                        ? `${result.pricing.roi_slow}%`
                        : "N/A"}
                    </strong>

                  </p>

                </div>

              </div>


              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="text-xs uppercase text-zinc-400">
                    Estimated Sale Time
                  </p>


                  <p className="mt-1 text-xl font-bold">
                    {
                      result.pricing
                        .estimated_sale_time
                    }
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-5">

                  <p className="text-xs uppercase text-zinc-400">
                    Purchase Verdict
                  </p>


                  <p className="mt-1 text-xl font-bold">
                    {
                      result.pricing
                        .verdict
                    }
                  </p>

                </div>

              </div>


              <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">

                ⚠️{" "}

                {
                  result.pricing
                    .reasoning
                }

              </div>

            </section>


            {/* LISTING CONFIGURATION SUMMARY */}

            <section className="rounded-2xl border bg-white p-6">

              <div>

                <h2 className="text-xl font-bold">
                  Listing Configuration
                </h2>


                <p className="mt-1 text-sm text-zinc-500">
                  These settings will be carried
                  over to Item Specifics.
                </p>

              </div>


              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase text-zinc-400">
                    Dispatch
                  </p>


                  <p className="mt-1 font-semibold">
                    {dispatchTime}
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase text-zinc-400">
                    Packaging
                  </p>


                  <p className="mt-1 font-semibold">
                    {packagingType}
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase text-zinc-400">
                    Item Status
                  </p>


                  <p className="mt-1 font-semibold">
                    {itemStatus}
                  </p>

                </div>


                <div className="rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs uppercase text-zinc-400">
                    Purchase Price
                  </p>


                  <p className="mt-1 font-semibold">
                    £{Number(
                      purchasePrice || 0
                    ).toFixed(2)}
                  </p>

                </div>

              </div>

            </section>


            {/* NEXT STEP */}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">

              <button
                type="button"
                onClick={
                  analyseAnotherItem
                }
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 font-semibold hover:bg-zinc-50"
              >
                Analyse Another Item
              </button>


              <button
                type="button"
                onClick={
                  goToItemSpecifics
                }
                className="rounded-xl bg-zinc-900 px-8 py-3 font-semibold text-white hover:bg-zinc-800"
              >
                Item Specifics →
              </button>

            </div>

          </div>

        )}


        {/* ANALYSE BUTTON */}

        {!result &&
          !isAnalysing && (

            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={
                  analyseItem
                }
                disabled={
                  photos.length === 0
                }
                className="rounded-xl bg-zinc-900 px-8 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyse Item →
              </button>

            </div>

          )}


        <p className="mt-8 text-center text-xs text-zinc-400">
          Reseller AI • Version 0.2.0
        </p>


      </div>

    </main>

  );

}