"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Lexend } from "next/font/google";


const lexend = Lexend({ subsets: ["latin"] });

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
  const pathname = usePathname();


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

      const formData =
        new FormData();


      photos.forEach(
        photo => {

          formData.append(
            "files",
            photo
          );

        }
      );


      formData.append(
        "purchase_price",
        purchasePrice || "0"
      );


      const response =
  await fetch(
    "/api/analyse",
    {
      method: "POST",
      body: formData,
    }
  );


      const data =
        await response.json();


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


      const safePricing = data.pricing ?? {
        market_estimate: 0,
        quick_sale: 0,
        normal_sale: 0,
        slow_sale: 0,
        recommended: 0,
        estimated_sale_time: "N/A",
        reasoning: "Pricing data was not returned by the AI for this item.",
        profit_quick: null,
        profit_normal: null,
        profit_slow: null,
        roi_quick: null,
        roi_normal: null,
        roi_slow: null,
        verdict: "N/A",
      };

      setResult({ ...data, pricing: safePricing });


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

  function goToItemSpecifics() {

    if (!result) {

      return;

    }


    const config = {

      dispatchTime,

      packagingType,

      packagingCondition,

      itemStatus,

      additionalNotes,

      purchasePrice,

    };


    // Store the AI result for the Item Specifics page.
    const resultJson = JSON.stringify(result);
    const configJson = JSON.stringify(config);

    sessionStorage.setItem("reseller_ai_result", resultJson);
    sessionStorage.setItem("reseller_ai_config", configJson);

    // Fallback for browsers where the session is lost during navigation.
    localStorage.setItem("reseller_ai_result", resultJson);
    localStorage.setItem("reseller_ai_config", configJson);


    // Move to the Item Specifics page.
    router.push("/specifics");

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

    <main className={`${lexend.className} min-h-screen pb-24 lg:pb-8 bg-[#f4f4f5] px-3 py-4 text-zinc-900 sm:p-6 lg:p-8`}>

      <div className="mx-auto max-w-[1450px]">


        {/* HEADER */}

        <div className="mb-5 sm:mb-8">

          <a
            href="/"
            className="text-sm font-medium text-[#5540c8] transition hover:text-[#4936b5]"
          >
            ← Back to Dashboard
          </a>


          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-5 sm:text-[29px]">
            Add Item
          </h1>


          <p className="mt-1 text-sm text-zinc-400">
            Photograph your item and let Reseller AI
            identify, list and price it.
          </p>

        </div>


        {/* PHOTOS */}

        <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

          <div className="flex justify-between">

            <div>

              <h2 className="text-lg font-semibold">
                Product Photos
              </h2>


              <p className="text-sm text-zinc-500">
                Add up to 5 photos.
              </p>

            </div>


            <div className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[10px] font-bold text-zinc-500">

              {photos.length}/5

            </div>

          </div>


          {!result &&
            photos.length < 5 && (

              <label className="mt-5 flex min-h-36 cursor-pointer sm:min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-[#f4f4f5]">

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

            <div className="mt-4 grid sm:mt-5 grid-cols-2 gap-4 sm:grid-cols-5">

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

        <section className="mt-6 rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

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

          <section className="mt-6 rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

            <div>

              <h2 className="text-lg font-semibold sm:text-xl">
                Listing Configuration
              </h2>


              <p className="mt-1 text-sm text-zinc-500">
                These settings will be carried over
                to the Item Specifics page.
              </p>

            </div>


            <div className="mt-4 grid sm:mt-6 gap-5 md:grid-cols-2">


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
                className="mt-2 min-h-24 w-full sm:min-h-28 rounded-xl border p-4 text-sm outline-none focus:border-zinc-900"
              />

            </div>

          </section>

        )}


        {/* ERROR */}

        {error && (

          <div className="mt-6 rounded-[20px] border border-red-100 bg-red-50 p-5 text-red-700">

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

          <section className="mt-6 rounded-[24px] bg-[#24232c] p-6 text-center text-white sm:p-10 shadow-[0_8px_30px_rgba(30,28,40,0.12)]">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-zinc-600 border-t-white" />


            <h2 className="mt-4 text-lg font-semibold sm:text-xl sm:mt-6 sm:text-2xl">
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

          <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">


            {/* IDENTIFICATION */}

            <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-[29px] font-semibold tracking-tight">
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


              <div className="mt-4 grid sm:mt-6 gap-4 sm:grid-cols-2 lg:grid-cols-4">

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
                      className="rounded-2xl bg-zinc-50 p-4"
                    >

                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
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

            <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-lg font-semibold sm:text-xl">
                    Size Conversion
                  </h2>


                  <p className="text-sm text-zinc-500">
                    Reseller AI detected the original
                    size system and converted it.
                  </p>

                </div>


                <div className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-[10px] font-bold text-zinc-500">

                  {percent(
                    result.product.size.confidence
                  )}

                  {" "}confidence

                </div>

              </div>


              <div className="mt-4 grid sm:mt-5 gap-4 md:grid-cols-4">

                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Detected
                  </p>


                  <p className="mt-1 text-xl font-semibold tracking-tight">
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


                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    🇬🇧 UK
                  </p>


                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {
                      result.product.size.uk
                    }
                  </p>

                </div>


                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    🇺🇸 US
                  </p>


                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {
                      result.product.size.us
                    }
                  </p>

                </div>


                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    🇪🇺 EU
                  </p>


                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {
                      result.product.size.eu
                    }
                  </p>

                </div>

              </div>

            </section>


            {/* CONDITION */}

            <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-lg font-semibold sm:text-xl">
                    Condition
                  </h2>


                  <p className="text-sm text-zinc-500">
                    Based on visible evidence in
                    the photographs.
                  </p>

                </div>


                <div className="text-right">

                  <p className="text-lg font-semibold sm:text-xl">
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

            <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

              <h2 className="text-[29px] font-semibold tracking-tight">
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
                  className="mt-2 min-h-56 w-full sm:min-h-96 rounded-xl border p-4 text-sm leading-7 outline-none focus:border-zinc-900"
                />

              </div>

            </section>


            {/* PRICING */}

            <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-[29px] font-semibold tracking-tight">
                    Pricing Analysis
                  </h2>


                  <p className="text-sm text-zinc-500">
                    Prototype estimate — live
                    marketplace data will be added later.
                  </p>

                </div>


                <div className="rounded-xl bg-[#f4f4f5] px-4 py-2 text-center">

                  <p className="text-xs text-zinc-500">
                    Recommended
                  </p>


                  <p className="text-lg font-semibold sm:text-xl">
                    {money(
                      result.pricing
                        .recommended
                    )}
                  </p>

                </div>

              </div>


              <div className="mt-4 grid sm:mt-6 gap-4 md:grid-cols-3">


                {/* QUICK */}

                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="font-semibold">
                    ⚡ Quick Sale
                  </p>


                  <p className="mt-2 text-2xl font-semibold sm:text-3xl">
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


                  <p className="mt-2 text-2xl font-semibold sm:text-3xl">
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

                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="font-semibold">
                    🐢 Slow Sale
                  </p>


                  <p className="mt-2 text-2xl font-semibold sm:text-3xl">
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


              <div className="mt-4 grid sm:mt-6 gap-4 md:grid-cols-2">

                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Estimated Sale Time
                  </p>


                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {
                      result.pricing
                        .estimated_sale_time
                    }
                  </p>

                </div>


                <div className="rounded-2xl bg-zinc-50 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Purchase Verdict
                  </p>


                  <p className="mt-1 text-xl font-semibold tracking-tight">
                    {
                      result.pricing
                        .verdict
                    }
                  </p>

                </div>

              </div>


              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">

                ⚠️{" "}

                {
                  result.pricing
                    .reasoning
                }

              </div>

            </section>


            {/* LISTING CONFIGURATION SUMMARY */}

            <section className="rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:rounded-[24px] sm:p-6">

              <div>

                <h2 className="text-lg font-semibold sm:text-xl">
                  Listing Configuration
                </h2>


                <p className="mt-1 text-sm text-zinc-500">
                  These settings will be carried
                  over to Item Specifics.
                </p>

              </div>


              <div className="mt-4 grid sm:mt-5 gap-4 sm:grid-cols-2 lg:grid-cols-4">


                <div className="rounded-2xl bg-zinc-50 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Dispatch
                  </p>


                  <p className="mt-1 font-semibold">
                    {dispatchTime}
                  </p>

                </div>


                <div className="rounded-2xl bg-zinc-50 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Packaging
                  </p>


                  <p className="mt-1 font-semibold">
                    {packagingType}
                  </p>

                </div>


                <div className="rounded-2xl bg-zinc-50 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                    Item Status
                  </p>


                  <p className="mt-1 font-semibold">
                    {itemStatus}
                  </p>

                </div>


                <div className="rounded-2xl bg-zinc-50 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
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
                className="rounded-full bg-[#5540c8] px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
              >
                Item Specifics →
              </button>

            </div>

          </div>

        )}


        {/* ANALYSE BUTTON */}

        {!result &&
          !isAnalysing && (

            <div className="sticky bottom-3 z-20 mt-4 flex justify-end rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-lg backdrop-blur sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">

              <button
                type="button"
                onClick={
                  analyseItem
                }
                disabled={
                  photos.length === 0
                }
                className="rounded-full bg-[#5540c8] px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4936b5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyse Item →
              </button>

            </div>

          )}


        <p className="mt-5 text-center sm:mt-8 text-xs text-zinc-400">
          Reseller AI • Version 0.2.0
        </p>


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