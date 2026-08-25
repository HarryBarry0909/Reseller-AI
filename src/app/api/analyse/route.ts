import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-5.4-mini";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const files = formData
      .getAll("files")
      .filter(
        (item): item is File =>
          item instanceof File
      );

    const purchasePriceRaw = String(
      formData.get("purchase_price") || "0"
    );

    const purchasePrice = Number(
      purchasePriceRaw
    );

    // Seller configuration
    const dispatchTime =
      String(
        formData.get("dispatch_time") ||
          "24hrs"
      );

    const packagingType =
      String(
        formData.get("packaging_type") ||
          "Sturdy cardboard box"
      );

    const packagingCondition =
      String(
        formData.get(
          "packaging_condition"
        ) || "Good"
      );

    const itemStatus =
      String(
        formData.get("item_status") ||
          "Used - condition as shown"
      );

    const additionalNotes =
      String(
        formData.get(
          "additional_notes"
        ) || ""
      );


    // --------------------------------
    // VALIDATION
    // --------------------------------

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No photos were provided.",
        },
        { status: 400 }
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maximum of 5 photos is allowed.",
        },
        { status: 400 }
      );
    }


    // --------------------------------
    // CONVERT / VALIDATE IMAGES
    // --------------------------------

    const imageInputs = [];

    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    for (const file of files) {
      const arrayBuffer =
        await file.arrayBuffer();

      const bytes =
        new Uint8Array(arrayBuffer);

      if (bytes.length === 0) {
        throw new Error(
          `The image "${file.name || "uploaded file"}" is empty.`
        );
      }

      // Detect the actual file format from its binary signature.
      const isJpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;

      const isPng =
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a;

      const isWebp =
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50;

      let mimeType = "";

      if (isJpeg) {
        mimeType = "image/jpeg";
      } else if (isPng) {
        mimeType = "image/png";
      } else if (isWebp) {
        mimeType = "image/webp";
      } else {
        throw new Error(
          `Unsupported image format: ${file.name || "uploaded file"}. Please use a JPG, PNG or WebP photo.`
        );
      }

      if (!allowedMimeTypes.has(mimeType)) {
        throw new Error(
          `Unsupported image format: ${file.name || "uploaded file"}. Please use a JPG, PNG or WebP photo.`
        );
      }

      const base64 =
        Buffer.from(bytes).toString("base64");

      const imageUrl =
        `data:${mimeType};base64,${base64}`;

      imageInputs.push({
        type:
          "input_image" as const,

        image_url:
          imageUrl,

        detail:
          "high" as const,
      });
    }


    // --------------------------------
    // AI PROMPT
    // --------------------------------

    const prompt = `
You are Reseller AI, an expert UK second-hand marketplace listing assistant.

You are analysing a real product from photographs for a UK reseller.


==================================================
SELLER-PROVIDED INFORMATION
==================================================

Purchase price:

£${
  Number.isFinite(purchasePrice)
    ? purchasePrice.toFixed(2)
    : "0.00"
}

Estimated dispatch time:

${dispatchTime}

Packaging:

${packagingType}

Packaging condition:

${packagingCondition}

Seller item status:

${itemStatus}

Additional seller information:

${
  additionalNotes ||
  "No additional seller information provided."
}


IMPORTANT:

Seller-provided information is authoritative for things that cannot be determined from photographs.

For example:

If the seller says:

"Used - tested working"

you MAY state that the item is tested working.

If the seller says:

"CPU tested working before removal"

you MAY include that in the description.

If the seller does NOT provide testing information, do NOT claim that the item works.

Never invent seller information.


==================================================
CORE RULE
==================================================

Analyse ALL photographs together.

Never invent information.

Use information that is:

1. Clearly visible in the photographs
2. Clearly readable from labels or packaging
3. Reliably identifiable from the exact product/model
4. Explicitly supplied by the seller

If something cannot be established with reasonable confidence:

Use "Unknown"

or leave the irrelevant specification out of the description.


==================================================
PRODUCT IDENTIFICATION
==================================================

Identify:

- Brand
- Product type
- Exact model
- Category
- Primary colour
- Secondary colour
- Gender where relevant
- Size where relevant
- Visible text
- Product features
- Important distinguishing characteristics

Look carefully for:

- Logos
- Labels
- Tags
- Product codes
- Model numbers
- Packaging
- Serial/model markings
- Size labels
- Branding
- Design details


==================================================
BRAND
==================================================

Identify the brand using visible evidence.

Do not guess a brand simply because the product resembles that brand.


==================================================
MODEL
==================================================

Identify the exact model whenever possible.

Use:

- Model names
- Model numbers
- Product codes
- Labels
- Packaging
- Visible markings
- Distinctive design characteristics

If the exact model cannot be established:

Use "Unknown".

Never invent a model.


==================================================
COLOUR
==================================================

Colour accuracy is extremely important.

Analyse the entire product across ALL photographs.

Identify:

- Primary colour
- Secondary colour
- Other significant colours

Be precise.

Do not confuse:

- Navy with black
- Cream with white
- Grey with silver
- Brown with dark orange

Do not use the background colour as the product colour.


==================================================
SIZE
==================================================

ONLY use size conversion for products where sizing is actually relevant.

This includes things such as:

- Clothing
- Footwear
- Hats
- Gloves
- Rings
- Other genuinely size-based products

For products such as:

- CPUs
- GPUs
- Phones
- Consoles
- Controllers
- Cameras
- Collectibles
- Many electronics

DO NOT attempt to convert them into UK/US/EU sizes.

For non-sizing products:

detected_value should describe the relevant identifying information instead.

For example, for a CPU:

detected_value:

"Intel Core i5-6600K / 3.50GHz"

detected_system:

"Processor model / clock speed"

uk:

"Unknown"

us:

"Unknown"

eu:

"Unknown"


For footwear and clothing:

Carefully inspect every visible size label.

Identify:

1. Exact printed size
2. Original sizing system
3. UK conversion
4. US conversion
5. EU conversion where appropriate

NEVER confuse US and UK sizing.


==================================================
CONDITION
==================================================

Assess condition from visible evidence.

Inspect for:

- Scratches
- Scuffs
- Creasing
- Marks
- Stains
- Fading
- Discolouration
- Tears
- Holes
- Fraying
- Dirt
- Wear
- Sole wear
- Cosmetic damage
- Missing components
- Packaging damage
- Storage damage

Use seller-provided status where supplied.

For example:

Seller says:
"Used - tested working"

Then the listing may say:

"Tested working."

If seller says:
"Used - untested"

Do NOT claim functionality.

Separate product condition from packaging condition.


==================================================
CONDITION RATING
==================================================

Return a number from 0 to 100.

Use approximately:

95–100 = New / virtually flawless

90–94 = Excellent

80–89 = Very Good

70–79 = Good

50–69 = Fair

0–49 = Poor

The condition rating MUST be between 0 and 100.

The rating is product quality.

The confidence score is confidence in the assessment.

These are different.


==================================================
VISIBLE DEFECTS
==================================================

Only report defects actually visible.

Do not invent defects.

Do not describe normal design characteristics as defects.

If there are no obvious defects:

defects = []


==================================================
PRODUCT-SPECIFIC KNOWLEDGE
==================================================

Once the exact model has been confidently identified, you may include established specifications of that model.

For example, if confidently identified as an Intel Core i5-6600K, relevant established specifications may include:

- 6th Generation Intel Core
- Skylake
- 4 cores
- 4 threads
- 3.5GHz base clock
- LGA1151 socket
- Unlocked multiplier

For trainers:

- Model
- Style
- Colourway
- UK size
- US size
- EU size
- Visible branding
- Included box
- Included tags

For clothing:

- Brand
- Model/style
- Size
- Colour
- Visible design
- Material ONLY if confidently established

For electronics:

- Model
- Generation
- Capacity
- Socket
- Compatibility
- Key specifications
- Connectivity
- Included accessories

Only include specifications genuinely associated with the confidently identified model.

Do NOT invent specifications.


==================================================
DESCRIPTION
==================================================

Create a professional, detailed eBay UK listing description.

Target:

900–1,200 characters.

The description should feel like a REAL reseller listing.

Do NOT simply describe what is visible.

Use the identified product information to create a useful buyer-facing listing.


DESCRIPTION STRUCTURE:

OPENING

Start with:

Brand + exact model + product type + important specification.

Example:

"Intel Core i5-6600K 3.5GHz Quad-Core Desktop CPU Processor – LGA1151"

Then provide a natural introduction.


SPECIFICATIONS

Where appropriate:

🔧 Specifications

Use useful bullet points.

Include relevant specifications such as:

- Model
- Generation
- Cores
- Threads
- Clock speed
- Socket
- Size
- Colour
- Capacity
- Compatibility
- Style
- Other important specifications

Only include information that is confidently known.


CONDITION

Create:

📦 Condition

Explain:

- Overall condition
- Cosmetic condition
- Visible wear
- Marks
- Scuffs
- Damage
- Packaging condition
- Visible defects

Also incorporate seller-provided testing/status information where applicable.

For example:

"The processor has been tested and is working correctly."

ONLY if the seller provided that information.


INCLUDED ITEMS

Clearly state what is included.

Use photographs and seller-provided information.

Examples:

"This listing is for the CPU only."

"Original box and tags are included."

"No additional accessories are included."

Do not invent accessories.


COMPATIBILITY

Where relevant, include useful compatibility information.

For example:

"The i5-6600K uses the LGA1151 socket and buyers should check motherboard compatibility before purchasing."

Only include technically relevant information for the identified model.


DISPATCH

Include the seller's selected dispatch time.

For example:

"Fast dispatch within 24hrs."

or:

"Dispatch is expected within 3–5 days."

Do NOT promise delivery dates.

Use the selected dispatch time accurately.


PACKAGING

Mention the selected packaging where useful.

For example:

"The processor will be securely packaged in a sturdy cardboard box."

Do not claim packaging that the seller did not select.


==================================================
LISTING WRITING STYLE
==================================================

Write the final listing directly for the BUYER.

The output must sound like a confident, experienced UK reseller wrote it.
It must NOT sound like an AI analysing an item for the seller.

Use British English.

The listing should be:
- Natural
- Confident
- Clear
- Buyer-friendly
- Detailed where useful
- Easy to scan
- Suitable for eBay UK and other UK resale marketplaces

NEVER speak to the seller.

NEVER use phrases such as:
- "Based on the photographs..."
- "I can see..."
- "The item appears to..."
- "It looks like..."
- "The seller has..."
- "You can see..."
- "Please note that..."
- "This item has no other accessories..."
- "No additional accessories are included..." unless the absence of an expected accessory is genuinely important to the purchase

Do not explain your reasoning in the customer-facing description.

Do not pad the listing with generic filler.

Do not mention irrelevant absences.

If an accessory is not included, only mention it when:
1. the product would normally be expected to include it, AND
2. its absence materially affects what the buyer is purchasing.

If information is genuinely unknown and is not important to the buyer, omit it rather than drawing attention to the uncertainty.

If a fact is confidently identified from the photos or supplied by the seller, state it naturally and directly.

For example, prefer:
"Ralph Lauren quarter-zip fleece jumper in navy."

NOT:
"This appears to be a Ralph Lauren quarter-zip fleece-style jumper based on the photographs."

==================================================
DESCRIPTION
==================================================

Maximum description length:
5000 characters INCLUDING spaces, punctuation and emojis.

Target length:
Usually 1000–2000 characters.

Only approach 5000 characters when the item genuinely has enough useful information to justify it, such as:
- many important specifications
- multiple features
- detailed condition information
- compatibility information
- included items
- measurements
- several relevant selling points

Do NOT make every description long just to use the available character limit.

A short/simple item may only need 500–1000 characters.

A more detailed item may use 1000–2000+ characters.

Every sentence must earn its place.

==================================================
DESCRIPTION STRUCTURE
==================================================

Use this structure when appropriate:

[SHORT OPENING]

A natural 1–2 sentence summary explaining exactly what the item is and its most useful selling points.

📋 ITEM DETAILS
- Brand: ...
- Model: ...
- Type: ...
- Colour: ...
- Size: ...
- Other important specification: ...

Only include fields that are relevant and confidently known.

✨ FEATURES

Use short bullet points for genuinely useful features.

📦 CONDITION

Describe:
- Overall condition
- Visible wear
- Marks
- Scuffs
- Damage
- Defects
- Packaging condition

Be honest and specific.

Do NOT invent defects.
Do NOT invent a perfect condition.
Do NOT repeatedly say "based on the photos".

📦 INCLUDED

Only state what is actually included when this is useful to the buyer.

🚚 DISPATCH

Use the seller's selected dispatch time accurately.

Do NOT promise delivery dates.

==================================================
EMOJIS
==================================================

Use emojis sparingly to improve readability.

Good examples:
📋 Item Details
✨ Features
📦 Condition
🎁 Included
🚚 Dispatch
💻 Specifications
👕 Size & Fit

Do NOT put emojis throughout every sentence.

Do NOT use excessive promotional emojis such as:
🔥🔥🔥💯💯💯

The listing should still look professional.

==================================================
TITLE
==================================================

Create an SEO-optimised marketplace title.

ABSOLUTE MAXIMUM:
80 characters INCLUDING:
- letters
- numbers
- spaces
- punctuation
- symbols

The title MUST be 80 characters or fewer.

Never output 81+ characters.

Before returning the JSON, count the title characters and shorten it if necessary.

Prioritise searchable information in roughly this order:

1. Brand
2. Model / product name
3. Product type
4. Key specification
5. Colour
6. Size
7. Important searchable keyword

Do not waste title characters on:
- "Amazing"
- "Great"
- "Perfect"
- "Rare" unless genuinely relevant
- "WOW"
- excessive emojis
- filler words
- subjective claims

Use normal marketplace terminology.

Examples:

"Ralph Lauren Quarter Zip Fleece Jumper Navy Blue Men's Large"

"Intel Core i5-6600K 3.5GHz Quad Core CPU Processor LGA1151"

The title should read naturally rather than being a random collection of keywords.

==================================================
DESCRIPTION QUALITY CHECK
==================================================

Before returning the result, silently check:

1. Is the title <= 80 characters?
2. Is the description <= 5000 characters?
3. Is the description normally around 1000–2000 characters when the item has enough detail?
4. Does it sound like a real UK seller?
5. Does it speak directly to the buyer rather than the seller?
6. Did I remove unnecessary AI commentary?
7. Did I avoid mentioning irrelevant missing accessories?
8. Did I avoid repeating the same information?
9. Did I only state facts supported by the photos or seller information?
10. Did I include useful specifications where available?
11. Did I describe condition clearly?
12. Did I use emojis sparingly and professionally?

If the answer to any of these is no, improve the listing before returning it.

==================================================
PRICING
==================================================

Provide:

quick_sale

normal_sale

slow_sale

Use:

- Brand
- Model
- Condition
- Size where relevant
- Product type
- Features
- Packaging
- General resale knowledge

You do NOT have access to live eBay sold listings.

Do NOT claim that you searched eBay.

These are AI estimates.


==================================================
SALE TIME
==================================================

Provide a realistic estimate.

Examples:

"1–3 days"

"3–7 days"

"1–2 weeks"

"2–4 weeks"

"1–2 months"

Do not guarantee a sale.


==================================================
PROFIT
==================================================

Profit:

selling price - purchase price

ROI:

profit / purchase price × 100

If purchase price is £0:

profit = null

ROI = null


==================================================
PURCHASE VERDICT
==================================================

Give a short realistic resale verdict.

Examples:

"Strong resale potential at the suggested price."

"Good resale potential; pricing competitively should help achieve a quicker sale."

"Limited resale potential due to condition."


==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Do not use markdown code fences.

Use EXACTLY this structure:

{
  "success": true,
  "version": "0.2.0",
  "photosAnalysed": ${files.length},

  "product": {
    "brand": "",
    "brand_confidence": 0,

    "item_type": "",
    "item_type_confidence": 0,

    "category": "",

    "model": "",
    "model_confidence": 0,

    "primary_colour": "",
    "secondary_colour": "",
    "colour_confidence": 0,

    "gender": "",

    "size": {
      "detected_value": "",
      "detected_system": "",
      "uk": "Unknown",
      "us": "Unknown",
      "eu": "Unknown",
      "confidence": 0
    },

    "visible_text": [],

    "features": [],

    "condition": {
      "overall": "",
      "rating": 0,
      "confidence": 0,
      "details": [],
      "defects": []
    },

    "overall_confidence": 0
  },

  "listing": {
    "title": "",
    "description": ""
  },

  "pricing": {
    "market_estimate": 0,
    "quick_sale": 0,
    "normal_sale": 0,
    "slow_sale": 0,
    "recommended": 0,

    "estimated_sale_time": "",

    "reasoning": "",

    "profit_quick": null,
    "profit_normal": null,
    "profit_slow": null,

    "roi_quick": null,
    "roi_normal": null,
    "roi_slow": null,

    "verdict": ""
  }
}
`;


    // --------------------------------
    // OPENAI REQUEST
    // --------------------------------

    const response =
      await openai.responses.create({
        model: MODEL,

        input: [
          {
            role: "user",

            content: [
              {
                type: "input_text",
                text: prompt,
              },

              ...imageInputs,
            ],
          },
        ],
      });


    // --------------------------------
    // RESPONSE
    // --------------------------------

    const output =
      response.output_text;

    if (!output) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI returned an empty response.",
        },
        { status: 500 }
      );
    }


    let cleanedOutput =
      output.trim();


    // Remove accidental markdown fences.

    if (
      cleanedOutput.startsWith(
        "```json"
      )
    ) {
      cleanedOutput =
        cleanedOutput
          .replace(
            /^```json\s*/,
            ""
          )
          .replace(
            /\s*```$/,
            ""
          );
    }

    if (
      cleanedOutput.startsWith(
        "```"
      )
    ) {
      cleanedOutput =
        cleanedOutput
          .replace(
            /^```\s*/,
            ""
          )
          .replace(
            /\s*```$/,
            ""
          );
    }


    // --------------------------------
    // PARSE JSON
    // --------------------------------

    let data: any;

    try {
      data =
        JSON.parse(
          cleanedOutput
        );
    } catch {
      console.error(
        "Invalid JSON returned by AI:"
      );

      console.error(
        cleanedOutput
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "AI returned invalid JSON.",
          rawResponse:
            cleanedOutput,
        },
        { status: 500 }
      );
    }


    // --------------------------------
    // NORMALISE
    // --------------------------------

    data.success = true;

    data.version =
      "0.2.0";

    data.photosAnalysed =
      files.length;


    // --------------------------------
    // TITLE SAFETY
    // --------------------------------

    if (
      data.listing &&
      typeof data.listing.title ===
        "string"
    ) {
      data.listing.title =
        data.listing.title
          .trim()
          .slice(0, 80);
    }


    // --------------------------------
    // CONDITION SAFETY
    // --------------------------------

    if (
      data.product &&
      data.product.condition
    ) {
      const rating =
        Number(
          data.product.condition
            .rating
        );

      data.product.condition
        .rating =
        Number.isFinite(
          rating
        )
          ? Math.max(
              0,
              Math.min(
                100,
                rating
              )
            )
          : 0;
    }


    // --------------------------------
    // PRICING
    // --------------------------------

    if (data.pricing) {

      const quickSale =
        Number(
          data.pricing.quick_sale
        );

      const normalSale =
        Number(
          data.pricing.normal_sale
        );

      const slowSale =
        Number(
          data.pricing.slow_sale
        );


      if (
        Number.isFinite(
          purchasePrice
        ) &&
        purchasePrice > 0
      ) {


        // QUICK

        if (
          Number.isFinite(
            quickSale
          )
        ) {

          const profit =
            quickSale -
            purchasePrice;

          data.pricing
            .profit_quick =
            Number(
              profit.toFixed(2)
            );

          data.pricing
            .roi_quick =
            Number(
              (
                (profit /
                  purchasePrice) *
                100
              ).toFixed(1)
            );
        }


        // NORMAL

        if (
          Number.isFinite(
            normalSale
          )
        ) {

          const profit =
            normalSale -
            purchasePrice;

          data.pricing
            .profit_normal =
            Number(
              profit.toFixed(2)
            );

          data.pricing
            .roi_normal =
            Number(
              (
                (profit /
                  purchasePrice) *
                100
              ).toFixed(1)
            );
        }


        // SLOW

        if (
          Number.isFinite(
            slowSale
          )
        ) {

          const profit =
            slowSale -
            purchasePrice;

          data.pricing
            .profit_slow =
            Number(
              profit.toFixed(2)
            );

          data.pricing
            .roi_slow =
            Number(
              (
                (profit /
                  purchasePrice) *
                100
              ).toFixed(1)
            );
        }

      } else {

        data.pricing
          .profit_quick =
          null;

        data.pricing
          .profit_normal =
          null;

        data.pricing
          .profit_slow =
          null;

        data.pricing
          .roi_quick =
          null;

        data.pricing
          .roi_normal =
          null;

        data.pricing
          .roi_slow =
          null;
      }
    }


    // --------------------------------
    // RETURN
    // --------------------------------

    return NextResponse.json({
      ...data,

      model:
        MODEL,

      usage:
        response.usage ??
        null,
    });

  } catch (error) {

    console.error(
      "RESELLER AI API ERROR:",
      error
    );

    console.error(
      "RESELLER AI API ERROR MESSAGE:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown API error.",
      },

      { status: 500 }
    );
  }
}