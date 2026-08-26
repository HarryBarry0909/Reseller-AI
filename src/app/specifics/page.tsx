"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Lexend } from "next/font/google";
import {
  addInventoryItem,
  createInventoryId,
  getInventoryItem,
  updateInventoryItem,
  type InventoryItem,
} from "../../lib/inventory-store";

/* =========================================================
   TYPES
========================================================= */

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

type SavedConfig = {
  dispatchTime: string;
  packagingType: string;
  packagingCondition: string;
  itemStatus: string;
  additionalNotes: string;
  purchasePrice: string;
};

type SpecificField = {
  label: string;
  value: string;
};


/* =========================================================
   DEFAULT CONFIG
========================================================= */

const DEFAULT_CONFIG: SavedConfig = {
  dispatchTime: "24hrs",
  packagingType: "Box",
  packagingCondition: "New / Good Condition",
  itemStatus: "Ready to Ship",
  additionalNotes: "",
  purchasePrice: "0",
};


/* =========================================================
   COMPONENT
========================================================= */

export default function ItemSpecifics() {
  const router = useRouter();


  /* =======================================================
     DATA
  ======================================================= */

  const [result, setResult] =
    useState<AIResult | null>(null);

  const [config, setConfig] =
    useState<SavedConfig>(DEFAULT_CONFIG);

  const [loading, setLoading] =
    useState(true);

  const [saved, setSaved] =
    useState(false);

  const [pageError, setPageError] =
    useState("");


  /* =======================================================
     EBAY CATEGORY
  ======================================================= */

  const [category, setCategory] =
    useState("");


  /* =======================================================
     BASIC LISTING
  ======================================================= */

  const [condition, setCondition] =
    useState("Used");

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");


  /* =======================================================
     SELLING FORMAT
  ======================================================= */

  const [sellingFormat, setSellingFormat] =
    useState("BUY_IT_NOW");


  /* =======================================================
     PRICING
  ======================================================= */

  const [selectedPrice, setSelectedPrice] =
    useState<number | null>(null);

  const [customPrice, setCustomPrice] =
    useState("");


  /* =======================================================
     OFFERS
  ======================================================= */

  const [allowOffers, setAllowOffers] =
    useState(false);

  const [autoAccept, setAutoAccept] =
    useState("");

  const [autoDecline, setAutoDecline] =
    useState("");


  /* =======================================================
     QUANTITY
  ======================================================= */

  const [quantity, setQuantity] =
    useState("1");


  /* =======================================================
     AUCTION
  ======================================================= */

  const [auctionStartPrice, setAuctionStartPrice] =
    useState("");

  const [auctionDuration, setAuctionDuration] =
    useState("7");

  const [auctionBuyItNow, setAuctionBuyItNow] =
    useState("");


  /* =======================================================
     SHIPPING
  ======================================================= */

  const [parcelSize, setParcelSize] =
    useState("Small");

  const [parcelWeight, setParcelWeight] =
    useState("");

  const [shippingPaidBy, setShippingPaidBy] =
    useState("BUYER");

  const [shippingPrice, setShippingPrice] =
    useState("");

  const [shippingService, setShippingService] =
    useState("Royal Mail 2nd Class");


  /* =======================================================
     PARCEL DIMENSIONS
  ======================================================= */

  const [parcelLength, setParcelLength] =
    useState("");

  const [parcelWidth, setParcelWidth] =
    useState("");

  const [parcelHeight, setParcelHeight] =
    useState("");


  /* =======================================================
     RETURNS
  ======================================================= */

  const [returnsAccepted, setReturnsAccepted] =
    useState(true);

  const [returnPeriod, setReturnPeriod] =
    useState("30");

  const [returnPostage, setReturnPostage] =
    useState("Buyer");


  /* =======================================================
     ITEM SPECIFICS
  ======================================================= */

  const [brand, setBrand] =
    useState("");

  const [model, setModel] =
    useState("");

  const [itemType, setItemType] =
    useState("");

  const [primaryColour, setPrimaryColour] =
    useState("");

  const [secondaryColour, setSecondaryColour] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [size, setSize] =
    useState("");

  const [processorSpeed, setProcessorSpeed] =
    useState("");

  const [socketType, setSocketType] =
    useState("");

  const [cores, setCores] =
    useState("");

  const [threads, setThreads] =
    useState("");

  const [generation, setGeneration] =
    useState("");


  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    try {
      const storedResult =
        sessionStorage.getItem(
          "reseller_ai_result"
        );

      const storedConfig =
        sessionStorage.getItem(
          "reseller_ai_config"
        );


      if (!storedResult) {
        router.push("/add");
        return;
      }


      const parsedResult =
        JSON.parse(
          storedResult
        ) as AIResult;


      setResult(parsedResult);


      /* -----------------------------------------------
         LOAD CONFIG
      ------------------------------------------------ */

      if (storedConfig) {
        try {
          const parsedConfig =
            JSON.parse(
              storedConfig
            ) as Partial<SavedConfig>;

          setConfig({
            ...DEFAULT_CONFIG,
            ...parsedConfig,
          });

        } catch {
          setConfig(
            DEFAULT_CONFIG
          );
        }
      }


      /* -----------------------------------------------
         BASIC LISTING
      ------------------------------------------------ */

      setCategory(
        parsedResult.product.category ||
        parsedResult.product.item_type ||
        "Other"
      );


      setTitle(
        parsedResult.listing.title || ""
      );


      setDescription(
        parsedResult.listing.description || ""
      );


      /* -----------------------------------------------
         PRICE
      ------------------------------------------------ */

      setSelectedPrice(
        Number(
          parsedResult.pricing.recommended || 0
        )
      );


      /* -----------------------------------------------
         PRODUCT SPECIFICS
      ------------------------------------------------ */

      setBrand(
        parsedResult.product.brand || ""
      );

      setModel(
        parsedResult.product.model || ""
      );

      setItemType(
        parsedResult.product.item_type || ""
      );

      setPrimaryColour(
        parsedResult.product.primary_colour || ""
      );

      setSecondaryColour(
        parsedResult.product.secondary_colour || ""
      );

      setGender(
        parsedResult.product.gender || ""
      );


      setSize(
        parsedResult.product.size?.detected_value ||
        ""
      );


      /* -----------------------------------------------
         CONDITION
      ------------------------------------------------ */

      const detectedCondition =
        (
          parsedResult.product.condition?.overall ||
          ""
        ).toLowerCase();


      if (
        detectedCondition.includes("new")
      ) {
        setCondition("New");
      } else if (
        detectedCondition.includes("excellent")
      ) {
        setCondition(
          "Used - Excellent"
        );
      } else if (
        detectedCondition.includes("very good")
      ) {
        setCondition(
          "Used - Very Good"
        );
      } else if (
        detectedCondition.includes("good")
      ) {
        setCondition(
          "Used - Good"
        );
      } else if (
        detectedCondition.includes("fair")
      ) {
        setCondition(
          "Used - Fair"
        );
      } else {
        setCondition("Used");
      }


      /* -----------------------------------------------
         TRY TO DETECT CPU INFORMATION
      ------------------------------------------------ */

      const visibleText =
        parsedResult.product.visible_text || [];

      const allText =
        [
          parsedResult.product.model,
          parsedResult.product.item_type,
          ...visibleText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();


      if (
        allText.includes("ghz")
      ) {
        const speedMatch =
          allText.match(
            /(\d+(?:\.\d+)?)\s*ghz/i
          );

        if (speedMatch) {
          setProcessorSpeed(
            `${speedMatch[1]} GHz`
          );
        }
      }


      if (
        allText.includes("lga1151")
      ) {
        setSocketType(
          "LGA1151"
        );
      }


      if (
        allText.includes("4 core") ||
        allText.includes("quad-core")
      ) {
        setCores("4");
      }


      if (
        allText.includes("4 thread")
      ) {
        setThreads("4");
      }


      if (
        allText.includes("6th gen") ||
        allText.includes("skylake")
      ) {
        setGeneration(
          "6th Generation"
        );
      }


    } catch (error) {

      console.error(
        "Failed to load listing data:",
        error
      );

      setPageError(
        "We couldn't load the listing data."
      );

    } finally {

      setLoading(false);

    }

  }, [router]);


  /* =======================================================
     MONEY
  ======================================================= */

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


  /* =======================================================
     CURRENT PRICE
  ======================================================= */

  function getCurrentPrice() {

    if (
      sellingFormat === "AUCTION"
    ) {
      return Number(
        auctionStartPrice || 0
      );
    }


    if (
      sellingFormat ===
      "AUCTION_BUY_IT_NOW"
    ) {
      return Number(
        auctionBuyItNow ||
        auctionStartPrice ||
        0
      );
    }


    if (
      customPrice !== ""
    ) {
      return Number(
        customPrice
      );
    }


    return Number(
      selectedPrice || 0
    );
  }


  /* =======================================================
     ESTIMATED PROFIT
  ======================================================= */

  function getEstimatedProfit() {

    const salePrice =
      getCurrentPrice();


    const purchasePrice =
      Number(
        config.purchasePrice || 0
      );


    if (
      !Number.isFinite(
        salePrice
      ) ||
      !Number.isFinite(
        purchasePrice
      )
    ) {
      return 0;
    }


    return (
      salePrice -
      purchasePrice
    );
  }


  /* =======================================================
     ROI
  ======================================================= */

  function getEstimatedROI() {

    const purchasePrice =
      Number(
        config.purchasePrice || 0
      );


    const profit =
      getEstimatedProfit();


    if (
      purchasePrice <= 0
    ) {
      return null;
    }


    return (
      (profit /
        purchasePrice) *
      100
    );
  }


  /* =======================================================
     SAVE LISTING
  ======================================================= */

  async function saveListing() {
    if (!result) {
      setPageError("There is no analysed item to save.");
      return;
    }

    setPageError("");

    try {
      // The item should normally have been created on the Add Item page.
      // However, if the session ID is missing or stale, create the
      // inventory record here instead of silently failing.
      let inventoryId =
        sessionStorage.getItem("reseller_ai_inventory_id");

      let existingItem = inventoryId
        ? getInventoryItem(inventoryId)
        : null;

      const finalPrice = getCurrentPrice();

      const imageSetId =
        sessionStorage.getItem("reseller_ai_image_set_id");

      const imageCount = Number(
        sessionStorage.getItem("reseller_ai_image_count") || 0
      );

      const purchasePrice =
        Number(config.purchasePrice || 0);

      const estimatedProfit =
        getEstimatedProfit();

      const estimatedROI =
        getEstimatedROI();

      const updatedProduct = {
        ...result.product,
        brand,
        model,
        item_type: itemType,
        primary_colour: primaryColour,
        secondary_colour: secondaryColour,
        gender,
        size: {
          ...result.product.size,
          detected_value: size,
        },
      };

      const itemData = {
        status: "Draft" as const,

        imageSetId: imageSetId || existingItem?.imageSetId || null,

        imageCount:
          imageCount ||
          existingItem?.imageCount ||
          result.photosAnalysed,

        product: updatedProduct,

        listing: {
          title,
          description,
        },

        category,
        condition,

        itemSpecifics: {
          brand,
          model,
          itemType,
          primaryColour,
          secondaryColour,
          gender,
          size,
          processorSpeed,
          socketType,
          cores,
          threads,
          generation,
        },

        selling: {
          format: sellingFormat,

          price:
            sellingFormat === "BUY_IT_NOW"
              ? finalPrice
              : null,

          customPrice:
            customPrice
              ? Number(customPrice)
              : null,

          allowOffers,

          autoAccept:
            autoAccept
              ? Number(autoAccept)
              : null,

          autoDecline:
            autoDecline
              ? Number(autoDecline)
              : null,

          quantity:
            Number(quantity) || 1,

          auction:
            sellingFormat !== "BUY_IT_NOW"
              ? {
                  startPrice: Number(auctionStartPrice || 0),
                  duration: Number(auctionDuration),
                  buyItNow: auctionBuyItNow
                    ? Number(auctionBuyItNow)
                    : null,
                }
              : null,
        },

        shipping: {
          paidBy: shippingPaidBy,

          price:
            shippingPaidBy === "BUYER"
              ? Number(shippingPrice || 0)
              : 0,

          service: shippingService,
          parcelSize,
          weight: Number(parcelWeight || 0),

          dimensions: {
            length: Number(parcelLength || 0),
            width: Number(parcelWidth || 0),
            height: Number(parcelHeight || 0),
          },
        },

        dispatch: config.dispatchTime,

        packaging: {
          type: config.packagingType,
          condition: config.packagingCondition,
        },

        returns: {
          accepted: returnsAccepted,
          period: returnsAccepted ? Number(returnPeriod) : null,
          postage: returnsAccepted ? returnPostage : null,
        },

        sellerStatus: config.itemStatus,
        additionalNotes: config.additionalNotes,

        purchasePrice,
        estimatedProfit,
        estimatedROI,

        quantity: Number(quantity) || 1,
        quantitySold: existingItem?.quantitySold || 0,
        soldPrice: existingItem?.soldPrice || null,
        soldAt: existingItem?.soldAt || null,
      };

      let updatedItem: InventoryItem | null = null;

      if (existingItem && inventoryId) {
        // Normal path: update the inventory item created by Add Item.
        updatedItem = updateInventoryItem(
          inventoryId,
          itemData
        );
      } else {
        // Recovery path: create the inventory item here.
        inventoryId = createInventoryId();

        const now = new Date().toISOString();

        const newItem: InventoryItem = {
          id: inventoryId,
          userId: null,
          createdAt: now,
          updatedAt: now,
          ...itemData,
          quantity: Number(quantity) || 1,
          quantitySold: 0,
          soldPrice: null,
          soldAt: null,
        };

        updatedItem = addInventoryItem(newItem);

        sessionStorage.setItem(
          "reseller_ai_inventory_id",
          inventoryId
        );
      }

      if (!updatedItem) {
        throw new Error(
          "The Inventory item could not be saved. Please try again."
        );
      }

      sessionStorage.setItem(
        "reseller_ai_inventory",
        JSON.stringify(updatedItem)
      );

      sessionStorage.removeItem(
        "reseller_ai_listing"
      );

      setSaved(true);

      console.log(
        "RESELLER AI INVENTORY SAVED:",
        updatedItem
      );
    } catch (error) {
      console.error(
        "RESELLER AI INVENTORY SAVE FAILED:",
        error
      );

      setSaved(false);
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not save this item to Inventory."
      );
    }
  }


  /* =======================================================
     INPUT HANDLER
  ======================================================= */

  function handleTextChange(
    setter: (
      value: string
    ) => void
  ) {
    return (
      event: ChangeEvent<HTMLInputElement>
    ) => {

      setter(
        event.target.value
      );

    };
  }


  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {

    return (

      <main className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5]`}>

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />

          <p className="mt-4 text-sm text-zinc-500">
            Loading listing...
          </p>

        </div>

      </main>

    );

  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (
    pageError ||
    !result
  ) {

    return (

      <main className={`${lexend.className} flex min-h-screen items-center justify-center bg-[#f4f4f5] p-6`}>

        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center">

          <div className="text-4xl">
            ⚠️
          </div>


          <h1 className="mt-4 text-xl font-bold">
            Listing unavailable
          </h1>


          <p className="mt-2 text-sm text-zinc-500">
            {pageError ||
              "There is no AI analysis available for this listing."}
          </p>


          <button
            type="button"
            onClick={() =>
              router.push("/add")
            }
            className="mt-6 rounded-full bg-[#5540c8] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
          >
            Back to Add Item
          </button>

        </div>

      </main>

    );

  }


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <main className={`${lexend.className} min-h-screen bg-[#f4f4f5] p-6 text-zinc-900 md:p-8`}>

      <div className="mx-auto max-w-[1450px]">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">

          <button
            type="button"
            onClick={() =>
              router.push("/add")
            }
            className="text-sm font-medium text-[#5540c8] transition hover:text-[#4936b5]"
          >
            ← Back to Analysis
          </button>


          <div className="mt-5">

            <p className="text-sm font-semibold text-zinc-500">
              eBay Listing
            </p>


            <h1 className="mt-1 text-3xl font-bold">
              Item Specifics
            </h1>


            <p className="mt-1 text-zinc-500">
              Review everything before saving your
              eBay listing.
            </p>

          </div>

        </div>


        {/* =================================================
            PRODUCT SUMMARY
        ================================================= */}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Detected Product
              </p>


              <h2 className="mt-1 text-[29px] font-semibold tracking-tight">

                {brand || "Unknown Brand"}

                {" "}

                {model || itemType || "Item"}

              </h2>


              <p className="mt-1 text-sm text-zinc-500">
                {itemType || "Product"}
              </p>

            </div>


            <div className="rounded-xl bg-zinc-100 px-6 py-4 text-center">

              <p className="text-xs text-zinc-500">
                AI Recommended Price
              </p>


              <p className="mt-1 text-[29px] font-semibold tracking-tight">
                {money(
                  result.pricing.recommended
                )}
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            CATEGORY
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <h2 className="text-xl font-bold">
            eBay Category
          </h2>


          <p className="mt-1 text-sm text-zinc-500">
            Reseller AI selected this automatically.
            You can change it if necessary.
          </p>


          <div className="mt-5">

            <label className="text-sm font-semibold">
              Category
            </label>


            <select
              value={category}
              onChange={
                event =>
                  setCategory(
                    event.target.value
                  )
              }
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 outline-none focus:border-zinc-900"
            >

              <option value={category}>
                {category || "Select category"}
              </option>


              <option value="CPUs / Processors">
                CPUs / Processors
              </option>


              <option value="Computer Components">
                Computer Components
              </option>


              <option value="Computers & Networking">
                Computers & Networking
              </option>


              <option value="Mobile Phones">
                Mobile Phones
              </option>


              <option value="Video Game Consoles">
                Video Game Consoles
              </option>


              <option value="Video Game Accessories">
                Video Game Accessories
              </option>


              <option value="Clothing">
                Clothing
              </option>


              <option value="Shoes">
                Shoes
              </option>


              <option value="Other">
                Other
              </option>

            </select>


            <p className="mt-2 text-xs text-zinc-400">
              Live eBay category matching will be
              connected later.
            </p>

          </div>

        </section>


        {/* =================================================
            TITLE / CONDITION / DESCRIPTION
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <h2 className="text-xl font-bold">
            Listing Information
          </h2>


          {/* TITLE */}

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <label className="text-sm font-semibold">
                eBay Title
              </label>


              <span className="text-xs text-zinc-400">
                {title.length}/80
              </span>

            </div>


            <input
              value={title}
              maxLength={80}
              onChange={
                event =>
                  setTitle(
                    event.target.value
                  )
              }
              className="mt-2 w-full rounded-xl border border-zinc-300 p-3 outline-none focus:border-zinc-900"
            />

          </div>


          {/* CONDITION */}

          <div className="mt-5">

            <label className="text-sm font-semibold">
              Condition
            </label>


            <select
              value={condition}
              onChange={
                event =>
                  setCondition(
                    event.target.value
                  )
              }
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 outline-none focus:border-zinc-900"
            >

              <option value="New">
                New
              </option>

              <option value="New with tags">
                New with tags
              </option>

              <option value="Used">
                Used
              </option>

              <option value="Used - Excellent">
                Used - Excellent
              </option>

              <option value="Used - Very Good">
                Used - Very Good
              </option>

              <option value="Used - Good">
                Used - Good
              </option>

              <option value="Used - Fair">
                Used - Fair
              </option>

              <option value="For parts or not working">
                For parts or not working
              </option>

            </select>

          </div>


          {/* DESCRIPTION */}

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <label className="text-sm font-semibold">
                eBay Description
              </label>


              <span className="text-xs text-zinc-400">
                {description.length} characters
              </span>

            </div>


            <textarea
              value={description}
              onChange={
                event =>
                  setDescription(
                    event.target.value
                  )
              }
              className="mt-2 min-h-[420px] w-full rounded-xl border border-zinc-300 p-4 text-sm leading-7 outline-none focus:border-zinc-900"
            />

          </div>

        </section>


        {/* =================================================
            ITEM SPECIFICS
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <div>

            <h2 className="text-xl font-bold">
              Item Specifics
            </h2>


            <p className="mt-1 text-sm text-zinc-500">
              AI-detected information. Everything
              here can be changed before listing.
            </p>

          </div>


          <div className="mt-6 grid gap-4 md:grid-cols-2">


            {/* BRAND */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Brand
              </label>


              <input
                value={brand}
                onChange={
                  handleTextChange(
                    setBrand
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* MODEL */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Model
              </label>


              <input
                value={model}
                onChange={
                  handleTextChange(
                    setModel
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* ITEM TYPE */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Item Type
              </label>


              <input
                value={itemType}
                onChange={
                  handleTextChange(
                    setItemType
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* PRIMARY COLOUR */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Primary Colour
              </label>


              <input
                value={primaryColour}
                onChange={
                  handleTextChange(
                    setPrimaryColour
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* SECONDARY COLOUR */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Secondary Colour
              </label>


              <input
                value={secondaryColour}
                onChange={
                  handleTextChange(
                    setSecondaryColour
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* GENDER */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Gender
              </label>


              <input
                value={gender}
                onChange={
                  handleTextChange(
                    setGender
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* SIZE */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Size
              </label>


              <input
                value={size}
                onChange={
                  handleTextChange(
                    setSize
                  )
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* PROCESSOR SPEED */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Processor Speed
              </label>


              <input
                value={processorSpeed}
                onChange={
                  handleTextChange(
                    setProcessorSpeed
                  )
                }
                placeholder="Only applicable to processors"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* SOCKET */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Socket Type
              </label>


              <input
                value={socketType}
                onChange={
                  handleTextChange(
                    setSocketType
                  )
                }
                placeholder="Only applicable to processors"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* CORES */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Number of Cores
              </label>


              <input
                value={cores}
                onChange={
                  handleTextChange(
                    setCores
                  )
                }
                placeholder="Only applicable to processors"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* THREADS */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Number of Threads
              </label>


              <input
                value={threads}
                onChange={
                  handleTextChange(
                    setThreads
                  )
                }
                placeholder="Only applicable to processors"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>


            {/* GENERATION */}

            <div className="rounded-2xl bg-zinc-50 p-4">

              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Generation
              </label>


              <input
                value={generation}
                onChange={
                  handleTextChange(
                    setGeneration
                  )
                }
                placeholder="Only applicable where relevant"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-white p-3 outline-none focus:border-zinc-900"
              />

            </div>

          </div>


          {/* VISIBLE TEXT */}

          {result.product.visible_text &&
            result.product.visible_text.length >
              0 && (

            <div className="mt-5 rounded-2xl bg-zinc-50 p-5">

              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Visible Product Information
              </p>


              <div className="mt-3 flex flex-wrap gap-2">

                {result.product.visible_text.map(
                  (
                    text,
                    index
                  ) => (

                    <span
                      key={`${text}-${index}`}
                      className="rounded-full bg-white px-3 py-2 text-sm"
                    >
                      {text}
                    </span>

                  )
                )}

              </div>

            </div>

          )}

        </section>


        {/* =================================================
            SELLING FORMAT
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <h2 className="text-xl font-bold">
            Selling Format
          </h2>


          <p className="mt-1 text-sm text-zinc-500">
            Choose how buyers will purchase this item.
          </p>


          <div className="mt-5 grid gap-4 md:grid-cols-3">


            {/* BUY IT NOW */}

            <button
              type="button"
              onClick={() =>
                setSellingFormat(
                  "BUY_IT_NOW"
                )
              }
              className={`rounded-xl border p-5 text-left transition ${
                sellingFormat ===
                "BUY_IT_NOW"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >

              <p className="font-bold">
                Buy It Now
              </p>


              <p className="mt-1 text-sm opacity-70">
                Sell immediately at a fixed price.
              </p>

            </button>


            {/* AUCTION */}

            <button
              type="button"
              onClick={() =>
                setSellingFormat(
                  "AUCTION"
                )
              }
              className={`rounded-xl border p-5 text-left transition ${
                sellingFormat ===
                "AUCTION"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >

              <p className="font-bold">
                Auction
              </p>


              <p className="mt-1 text-sm opacity-70">
                Buyers compete for the item.
              </p>

            </button>


            {/* AUCTION + BUY IT NOW */}

            <button
              type="button"
              onClick={() =>
                setSellingFormat(
                  "AUCTION_BUY_IT_NOW"
                )
              }
              className={`rounded-xl border p-5 text-left transition ${
                sellingFormat ===
                "AUCTION_BUY_IT_NOW"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >

              <p className="font-bold">
                Auction + Buy It Now
              </p>


              <p className="mt-1 text-sm opacity-70">
                Give buyers both options.
              </p>

            </button>

          </div>


          {/* QUANTITY */}

          <div className="mt-5 max-w-xs">

            <label className="text-sm font-semibold">
              Quantity
            </label>


            <input
              type="number"
              min="1"
              value={quantity}
              onChange={
                event =>
                  setQuantity(
                    event.target.value
                  )
              }
              className="mt-2 w-full rounded-xl border border-zinc-300 p-3 outline-none focus:border-zinc-900"
            />

          </div>

        </section>


        {/* =================================================
            PRICING
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <div>

            <h2 className="text-xl font-bold">
              Selling Price
            </h2>


            <p className="mt-1 text-sm text-zinc-500">
              Choose from the three AI recommendations
              or enter your own price.
            </p>

          </div>


          <div className="mt-6 grid gap-4 md:grid-cols-3">


            {/* QUICK */}

            <button
              type="button"
              onClick={() => {

                setSelectedPrice(
                  result.pricing.quick_sale
                );

                setCustomPrice("");

              }}
              className={`rounded-xl border p-5 text-left transition ${
                selectedPrice ===
                result.pricing.quick_sale &&
                customPrice === ""
                  ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >

              <p className="font-semibold">
                ⚡ Quick Sale
              </p>


              <p className="mt-2 text-3xl font-bold">
                {money(
                  result.pricing.quick_sale
                )}
              </p>


              <p className="mt-1 text-sm text-zinc-500">
                Prioritise speed
              </p>


              <div className="mt-4 space-y-1 text-sm">

                <p>
                  Profit:{" "}
                  <strong>
                    {money(
                      result.pricing.profit_quick
                    )}
                  </strong>
                </p>


                <p>
                  ROI:{" "}
                  <strong>
                    {result.pricing.roi_quick !==
                    null
                      ? `${Number(
                          result.pricing.roi_quick
                        ).toFixed(1)}%`
                      : "N/A"}
                  </strong>
                </p>

              </div>

            </button>


            {/* RECOMMENDED */}

            <button
              type="button"
              onClick={() => {

                setSelectedPrice(
                  result.pricing.normal_sale
                );

                setCustomPrice("");

              }}
              className={`rounded-xl border-2 p-5 text-left transition ${
                selectedPrice ===
                result.pricing.normal_sale &&
                customPrice === ""
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-900 bg-white hover:bg-zinc-50"
              }`}
            >

              <p className="font-semibold">
                🎯 Recommended
              </p>


              <p className="mt-2 text-3xl font-bold">
                {money(
                  result.pricing.normal_sale
                )}
              </p>


              <p className="mt-1 text-sm opacity-70">
                Recommended balance
              </p>


              <div className="mt-4 space-y-1 text-sm">

                <p>
                  Profit:{" "}
                  <strong>
                    {money(
                      result.pricing.profit_normal
                    )}
                  </strong>
                </p>


                <p>
                  ROI:{" "}
                  <strong>
                    {result.pricing.roi_normal !==
                    null
                      ? `${Number(
                          result.pricing.roi_normal
                        ).toFixed(1)}%`
                      : "N/A"}
                  </strong>
                </p>

              </div>

            </button>


            {/* SLOW */}

            <button
              type="button"
              onClick={() => {

                setSelectedPrice(
                  result.pricing.slow_sale
                );

                setCustomPrice("");

              }}
              className={`rounded-xl border p-5 text-left transition ${
                selectedPrice ===
                result.pricing.slow_sale &&
                customPrice === ""
                  ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >

              <p className="font-semibold">
                🐢 Slow Sale
              </p>


              <p className="mt-2 text-3xl font-bold">
                {money(
                  result.pricing.slow_sale
                )}
              </p>


              <p className="mt-1 text-sm text-zinc-500">
                Higher asking price
              </p>


              <div className="mt-4 space-y-1 text-sm">

                <p>
                  Profit:{" "}
                  <strong>
                    {money(
                      result.pricing.profit_slow
                    )}
                  </strong>
                </p>


                <p>
                  ROI:{" "}
                  <strong>
                    {result.pricing.roi_slow !==
                    null
                      ? `${Number(
                          result.pricing.roi_slow
                        ).toFixed(1)}%`
                      : "N/A"}
                  </strong>
                </p>

              </div>

            </button>

          </div>


          {/* CUSTOM */}

          <div className="mt-5 max-w-md">

            <label className="text-sm font-semibold">
              Custom Price
            </label>


            <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

              <span className="text-zinc-500">
                £
              </span>


              <input
                type="number"
                min="0"
                step="0.01"
                value={customPrice}
                onChange={
                  event => {

                    setCustomPrice(
                      event.target.value
                    );

                    if (
                      event.target.value
                    ) {
                      setSelectedPrice(
                        null
                      );
                    }

                  }
                }
                placeholder="Enter custom price"
                className="w-full p-3 outline-none"
              />

            </div>

          </div>

        </section>


        {/* =================================================
            OFFERS
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <div className="flex items-center justify-between gap-5">

            <div>

              <h2 className="text-xl font-bold">
                Allow Offers
              </h2>


              <p className="mt-1 text-sm text-zinc-500">
                Allow buyers to send you offers.
              </p>

            </div>


            <button
              type="button"
              aria-label="Toggle offers"
              onClick={() =>
                setAllowOffers(
                  current =>
                    !current
                )
              }
              className={`h-7 w-12 rounded-full p-1 transition ${
                allowOffers
                  ? "bg-zinc-900"
                  : "bg-zinc-300"
              }`}
            >

              <div
                className={`h-5 w-5 rounded-full bg-white transition ${
                  allowOffers
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />

            </button>

          </div>


          {allowOffers && (

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-semibold">
                  Auto-accept above
                </label>


                <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

                  <span className="text-zinc-500">
                    £
                  </span>


                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={autoAccept}
                    onChange={
                      event =>
                        setAutoAccept(
                          event.target.value
                        )
                    }
                    placeholder="35.00"
                    className="w-full p-3 outline-none"
                  />

                </div>

              </div>


              <div>

                <label className="text-sm font-semibold">
                  Auto-decline below
                </label>


                <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

                  <span className="text-zinc-500">
                    £
                  </span>


                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={autoDecline}
                    onChange={
                      event =>
                        setAutoDecline(
                          event.target.value
                        )
                    }
                    placeholder="25.00"
                    className="w-full p-3 outline-none"
                  />

                </div>

              </div>

            </div>

          )}

        </section>


        {/* =================================================
            AUCTION
        ================================================= */}

        {sellingFormat !==
          "BUY_IT_NOW" && (

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

            <h2 className="text-xl font-bold">
              Auction Settings
            </h2>


            <div className="mt-5 grid gap-5 md:grid-cols-3">


              {/* START */}

              <div>

                <label className="text-sm font-semibold">
                  Starting Price
                </label>


                <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

                  <span className="text-zinc-500">
                    £
                  </span>


                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      auctionStartPrice
                    }
                    onChange={
                      event =>
                        setAuctionStartPrice(
                          event.target.value
                        )
                    }
                    placeholder="20.00"
                    className="w-full p-3 outline-none"
                  />

                </div>

              </div>


              {/* DURATION */}

              <div>

                <label className="text-sm font-semibold">
                  Auction Duration
                </label>


                <select
                  value={
                    auctionDuration
                  }
                  onChange={
                    event =>
                      setAuctionDuration(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
                >

                  <option value="3">
                    3 days
                  </option>

                  <option value="5">
                    5 days
                  </option>

                  <option value="7">
                    7 days
                  </option>

                  <option value="10">
                    10 days
                  </option>

                </select>

              </div>


              {/* BUY IT NOW */}

              {sellingFormat ===
                "AUCTION_BUY_IT_NOW" && (

                <div>

                  <label className="text-sm font-semibold">
                    Buy It Now Price
                  </label>


                  <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

                    <span className="text-zinc-500">
                      £
                    </span>


                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        auctionBuyItNow
                      }
                      onChange={
                        event =>
                          setAuctionBuyItNow(
                            event.target.value
                          )
                      }
                      placeholder="39.99"
                      className="w-full p-3 outline-none"
                    />

                  </div>

                </div>

              )}

            </div>

          </section>

        )}


        {/* =================================================
            SHIPPING
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <h2 className="text-xl font-bold">
            Shipping
          </h2>


          <p className="mt-1 text-sm text-zinc-500">
            Decide how the item will be shipped and
            what the buyer will pay.
          </p>


          <div className="mt-6 grid gap-5 md:grid-cols-2">


            {/* WHO PAYS */}

            <div>

              <label className="text-sm font-semibold">
                Shipping Paid By
              </label>


              <select
                value={
                  shippingPaidBy
                }
                onChange={
                  event =>
                    setShippingPaidBy(
                      event.target.value
                    )
                }
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
              >

                <option value="BUYER">
                  Buyer
                </option>

                <option value="SELLER">
                  Seller - Free Shipping
                </option>

              </select>

            </div>


            {/* SERVICE */}

            <div>

              <label className="text-sm font-semibold">
                Shipping Service
              </label>


              <select
                value={
                  shippingService
                }
                onChange={
                  event =>
                    setShippingService(
                      event.target.value
                    )
                }
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
              >

                <option>
                  Royal Mail 2nd Class
                </option>

                <option>
                  Royal Mail 1st Class
                </option>

                <option>
                  Evri Standard
                </option>

                <option>
                  InPost Locker to Locker
                </option>

                <option>
                  InPost Locker to Home
                </option>

                <option>
                  Other
                </option>

              </select>

            </div>


            {/* PRICE */}

            <div>

              <label className="text-sm font-semibold">
                Buyer Shipping Price
              </label>


              <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

                <span className="text-zinc-500">
                  £
                </span>


                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    shippingPrice
                  }
                  disabled={
                    shippingPaidBy ===
                    "SELLER"
                  }
                  onChange={
                    event =>
                      setShippingPrice(
                        event.target.value
                      )
                  }
                  placeholder="3.49"
                  className="w-full p-3 outline-none disabled:bg-zinc-100"
                />

              </div>

            </div>


            {/* PARCEL SIZE */}

            <div>

              <label className="text-sm font-semibold">
                Parcel Size
              </label>


              <select
                value={
                  parcelSize
                }
                onChange={
                  event =>
                    setParcelSize(
                      event.target.value
                    )
                }
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
              >

                <option>
                  Letter
                </option>

                <option>
                  Small
                </option>

                <option>
                  Medium
                </option>

                <option>
                  Large
                </option>

                <option>
                  Custom
                </option>

              </select>

            </div>


            {/* WEIGHT */}

            <div>

              <label className="text-sm font-semibold">
                Parcel Weight
              </label>


              <div className="mt-2 flex items-center rounded-xl border border-zinc-300 px-4">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    parcelWeight
                  }
                  onChange={
                    event =>
                      setParcelWeight(
                        event.target.value
                      )
                  }
                  placeholder="0.50"
                  className="w-full p-3 outline-none"
                />


                <span className="text-sm text-zinc-500">
                  kg
                </span>

              </div>

            </div>


            {/* DISPATCH */}

            <div>

              <label className="text-sm font-semibold">
                Estimated Dispatch
              </label>


              <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-medium">
                {config.dispatchTime}
              </div>


              <p className="mt-1 text-xs text-zinc-400">
                Set on the Add Item page.
              </p>

            </div>

          </div>


          {/* CUSTOM DIMENSIONS */}

          {parcelSize ===
            "Custom" && (

            <div className="mt-5 rounded-2xl bg-zinc-50 p-5">

              <h3 className="font-semibold">
                Parcel Dimensions
              </h3>


              <div className="mt-4 grid gap-4 md:grid-cols-3">


                <div>

                  <label className="text-xs text-zinc-500">
                    Length
                  </label>


                  <div className="mt-1 flex items-center rounded-lg border bg-white px-3">

                    <input
                      type="number"
                      min="0"
                      value={
                        parcelLength
                      }
                      onChange={
                        event =>
                          setParcelLength(
                            event.target.value
                          )
                      }
                      className="w-full p-2 outline-none"
                    />


                    <span className="text-xs text-zinc-400">
                      cm
                    </span>

                  </div>

                </div>


                <div>

                  <label className="text-xs text-zinc-500">
                    Width
                  </label>


                  <div className="mt-1 flex items-center rounded-lg border bg-white px-3">

                    <input
                      type="number"
                      min="0"
                      value={
                        parcelWidth
                      }
                      onChange={
                        event =>
                          setParcelWidth(
                            event.target.value
                          )
                      }
                      className="w-full p-2 outline-none"
                    />


                    <span className="text-xs text-zinc-400">
                      cm
                    </span>

                  </div>

                </div>


                <div>

                  <label className="text-xs text-zinc-500">
                    Height
                  </label>


                  <div className="mt-1 flex items-center rounded-lg border bg-white px-3">

                    <input
                      type="number"
                      min="0"
                      value={
                        parcelHeight
                      }
                      onChange={
                        event =>
                          setParcelHeight(
                            event.target.value
                          )
                      }
                      className="w-full p-2 outline-none"
                    />


                    <span className="text-xs text-zinc-400">
                      cm
                    </span>

                  </div>

                </div>

              </div>

            </div>

          )}

        </section>


        {/* =================================================
            PACKAGING
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <h2 className="text-xl font-bold">
            Packaging
          </h2>


          <p className="mt-1 text-sm text-zinc-500">
            Packaging information carried over from
            the Add Item page.
          </p>


          <div className="mt-5 grid gap-4 md:grid-cols-3">


            <div className="rounded-2xl bg-zinc-50 p-4">

              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Packaging Type
              </p>


              <p className="mt-1 font-semibold">
                {config.packagingType}
              </p>

            </div>


            <div className="rounded-2xl bg-zinc-50 p-4">

              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Packaging Condition
              </p>


              <p className="mt-1 font-semibold">
                {config.packagingCondition}
              </p>

            </div>


            <div className="rounded-2xl bg-zinc-50 p-4">

              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Item Status
              </p>


              <p className="mt-1 font-semibold">
                {config.itemStatus}
              </p>

            </div>

          </div>


          {config.additionalNotes && (

            <div className="mt-4 rounded-2xl bg-zinc-50 p-4">

              <p className="text-xs uppercase tracking-wide text-zinc-400">
                Additional Notes
              </p>


              <p className="mt-1 text-sm">
                {config.additionalNotes}
              </p>

            </div>

          )}

        </section>


        {/* =================================================
            RETURNS
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">

          <div className="flex items-center justify-between gap-5">

            <div>

              <h2 className="text-xl font-bold">
                Returns
              </h2>


              <p className="mt-1 text-sm text-zinc-500">
                Configure your return settings.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                setReturnsAccepted(
                  current =>
                    !current
                )
              }
              className={`h-7 w-12 rounded-full p-1 transition ${
                returnsAccepted
                  ? "bg-zinc-900"
                  : "bg-zinc-300"
              }`}
            >

              <div
                className={`h-5 w-5 rounded-full bg-white transition ${
                  returnsAccepted
                    ? "translate-x-5"
                    : ""
                }`}
              />

            </button>

          </div>


          {returnsAccepted && (

            <div className="mt-5 grid gap-5 md:grid-cols-2">


              <div>

                <label className="text-sm font-semibold">
                  Return Period
                </label>


                <select
                  value={
                    returnPeriod
                  }
                  onChange={
                    event =>
                      setReturnPeriod(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
                >

                  <option value="14">
                    14 days
                  </option>

                  <option value="30">
                    30 days
                  </option>

                  <option value="60">
                    60 days
                  </option>

                </select>

              </div>


              <div>

                <label className="text-sm font-semibold">
                  Return Postage Paid By
                </label>


                <select
                  value={
                    returnPostage
                  }
                  onChange={
                    event =>
                      setReturnPostage(
                        event.target.value
                      )
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
                >

                  <option value="Buyer">
                    Buyer
                  </option>

                  <option value="Seller">
                    Seller
                  </option>

                </select>

              </div>

            </div>

          )}

        </section>


        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="mt-6 rounded-2xl bg-zinc-900 p-6 text-white">

          <div className="flex flex-col justify-between gap-5 md:flex-row">

            <div>

              <h2 className="text-xl font-bold">
                Listing Summary
              </h2>


              <p className="mt-1 text-sm text-zinc-400">
                Review the important numbers before
                saving.
              </p>

            </div>


            <div className="rounded-xl bg-white/10 px-5 py-3 text-center">

              <p className="text-xs text-zinc-400">
                Selling Price
              </p>


              <p className="text-[29px] font-semibold tracking-tight">
                {money(
                  getCurrentPrice()
                )}
              </p>

            </div>

          </div>


          <div className="mt-6 grid gap-4 md:grid-cols-3">


            <div className="rounded-xl bg-white/10 p-5">

              <p className="text-sm text-zinc-400">
                Purchase Price
              </p>


              <p className="mt-1 text-[29px] font-semibold tracking-tight">
                {money(
                  Number(
                    config.purchasePrice || 0
                  )
                )}
              </p>

            </div>


            <div className="rounded-xl bg-white/10 p-5">

              <p className="text-sm text-zinc-400">
                Estimated Profit
              </p>


              <p className="mt-1 text-[29px] font-semibold tracking-tight">
                {money(
                  getEstimatedProfit()
                )}
              </p>

            </div>


            <div className="rounded-xl bg-white/10 p-5">

              <p className="text-sm text-zinc-400">
                Estimated ROI
              </p>


              <p className="mt-1 text-[29px] font-semibold tracking-tight">

                {getEstimatedROI() !==
                null
                  ? `${getEstimatedROI()!.toFixed(
                      1
                    )}%`
                  : "N/A"}

              </p>

            </div>

          </div>


          <div className="mt-5 rounded-xl bg-white/5 p-4 text-xs text-zinc-400">

            This is currently an estimated profit
            calculation before actual eBay fees.
            We will connect live eBay fee calculations
            later.

          </div>

        </section>


        {/* =================================================
            BOTTOM BUTTONS
        ================================================= */}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">


          <button
            type="button"
            onClick={() =>
              router.push("/add")
            }
            className="rounded-xl border border-zinc-300 bg-white px-6 py-3 font-semibold hover:bg-zinc-50"
          >
            ← Back to Analysis
          </button>


          <button
            type="button"
            onClick={
              saveListing
            }
            className="rounded-full bg-[#5540c8] px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-[#4936b5]"
          >
            {saved
              ? "✓ Saved to Inventory"
              : "Save to Inventory →"}
          </button>

        </div>


        {/* =================================================
            SAVED MESSAGE
        ================================================= */}

        {saved && (

          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">

            <p className="font-semibold">
              ✓ Listing saved successfully
            </p>


            <p className="mt-1 text-sm">
              Your item has been saved to Inventory.
              It remains a Draft until you choose to list
              it.
            </p>

          </div>

        )}


        {/* =================================================
            FOOTER
        ================================================= */}

        <p className="mt-8 pb-8 text-center text-xs text-zinc-400">
          Reseller AI • eBay Listing Setup • Version 0.2.0
        </p>


      </div>

    </main>

  );
}