export const LISTINGS_KEY = "reseller_ai_listings";

const DB_NAME = "reseller-ai-db";
const DB_VERSION = 1;
const IMAGE_STORE = "listing-images";

export type ListingRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;

  status:
    | "Draft"
    | "Ready to List"
    | "Listed"
    | "Sold"
    | "Unsold"
    | "Removed"
    | "Cancelled";

  marketplace:
    | "eBay"
    | "Vinted"
    | "Other";

  listing: {
    title: string;
    description: string;
  };

  product: any;

  category: string;
  condition: string;

  itemSpecifics: Record<
    string,
    string
  >;

  selling: any;
  shipping: any;

  dispatch?: string;
  packaging?: any;
  returns?: any;

  sellerStatus?: string;
  additionalNotes?: string;

  purchasePrice: number;
  estimatedProfit: number;
  estimatedROI: number | null;

  soldPrice: number | null;
  soldAt: string | null;

  quantity: number;
  quantitySold: number;

  imageSetId: string | null;
  imageCount: number;
};

/* =========================================================
   ID
========================================================= */

function makeId(
  prefix = "listing"
) {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function createId(
  prefix = "listing"
) {
  return makeId(prefix);
}

/* =========================================================
   LISTINGS
========================================================= */

export function getListings(): ListingRecord[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      localStorage.getItem(
        LISTINGS_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {
    return [];
  }
}

export function writeListings(
  listings: ListingRecord[]
) {
  localStorage.setItem(
    LISTINGS_KEY,
    JSON.stringify(listings)
  );

  window.dispatchEvent(
    new CustomEvent(
      "reseller-ai-listings-changed"
    )
  );
}

export function addListing(
  listing: ListingRecord
) {
  const listings =
    getListings();

  listings.unshift(listing);

  writeListings(listings);

  return listing;
}

export function updateListing(
  id: string,
  patch: Partial<ListingRecord>
) {
  const listings =
    getListings();

  const index =
    listings.findIndex(
      (item) =>
        item.id === id
    );

  if (index === -1) {
    return null;
  }

  listings[index] = {
    ...listings[index],
    ...patch,
    updatedAt:
      new Date().toISOString(),
  };

  writeListings(listings);

  return listings[index];
}

export function getListing(
  id: string
) {
  return getListings().find(
    (item) =>
      item.id === id
  ) ?? null;
}

export function deleteListing(
  id: string
) {
  const listings =
    getListings();

  const listing =
    listings.find(
      (item) =>
        item.id === id
    );

  writeListings(
    listings.filter(
      (item) =>
        item.id !== id
    )
  );

  if (
    listing?.imageSetId
  ) {
    void deleteImageSet(
      listing.imageSetId
    );
  }
}

/* =========================================================
   IMAGE DATABASE
========================================================= */

function openDatabase(): Promise<IDBDatabase> {
  return new Promise(
    (resolve, reject) => {

      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );

      request.onupgradeneeded =
        () => {

          const db =
            request.result;

          if (
            !db.objectStoreNames.contains(
              IMAGE_STORE
            )
          ) {
            db.createObjectStore(
              IMAGE_STORE
            );
          }
        };

      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };

      request.onerror =
        () => {
          reject(
            request.error
          );
        };
    }
  );
}

/* =========================================================
   SAVE IMAGE SET
========================================================= */

export async function saveImageSet(
  blobs: Blob[]
): Promise<{
  id: string;
  count: number;
}> {

  const id =
    makeId("images");

  const db =
    await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {

      const tx =
        db.transaction(
          IMAGE_STORE,
          "readwrite"
        );

      const store =
        tx.objectStore(
          IMAGE_STORE
        );

      blobs.forEach(
        (
          blob,
          index
        ) => {

          store.put(
            blob,
            `${id}_${index}`
          );

        }
      );

      tx.oncomplete =
        () => resolve();

      tx.onerror =
        () => reject(
          tx.error
        );
    }
  );

  db.close();

  return {
    id,
    count: blobs.length,
  };
}

/* =========================================================
   GET IMAGE SET
========================================================= */

export async function getImageSet(
  id: string,
  count: number
): Promise<Blob[]> {

  if (
    !id ||
    !count
  ) {
    return [];
  }

  const db =
    await openDatabase();

  const blobs =
    await Promise.all(

      Array.from(
        {
          length: count,
        },
        (
          _,
          index
        ) =>
          new Promise<
            Blob | null
          >(
            (
              resolve,
              reject
            ) => {

              const request =
                db
                  .transaction(
                    IMAGE_STORE,
                    "readonly"
                  )
                  .objectStore(
                    IMAGE_STORE
                  )
                  .get(
                    `${id}_${index}`
                  );

              request.onsuccess =
                () => {

                  resolve(
                    request.result ??
                      null
                  );

                };

              request.onerror =
                () => {

                  reject(
                    request.error
                  );

                };
            }
          )
      )

    );

  db.close();

  return blobs.filter(
    (
      blob
    ): blob is Blob =>
      Boolean(blob)
  );
}

/* =========================================================
   DELETE IMAGE SET
========================================================= */

export async function deleteImageSet(
  id: string
) {

  if (!id) {
    return;
  }

  const db =
    await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {

      const tx =
        db.transaction(
          IMAGE_STORE,
          "readwrite"
        );

      const store =
        tx.objectStore(
          IMAGE_STORE
        );

      /*
       * Delete up to 10 photos.
       * This matches the existing system's
       * maximum expected image count.
       */
      for (
        let i = 0;
        i < 10;
        i++
      ) {
        store.delete(
          `${id}_${i}`
        );
      }

      tx.oncomplete =
        () => resolve();

      tx.onerror =
        () => reject(
          tx.error
        );
    }
  );

  db.close();
}

/* =========================================================
   IMAGE COMPRESSION
========================================================= */

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<Blob> {

  const bitmap =
    await createImageBitmap(
      file
    );

  const scale =
    Math.min(
      1,
      maxDimension /
        Math.max(
          bitmap.width,
          bitmap.height
        )
    );

  const width =
    Math.max(
      1,
      Math.round(
        bitmap.width *
          scale
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        bitmap.height *
          scale
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Could not create image canvas."
    );
  }

  ctx.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );

  bitmap.close();

  const blob =
    await new Promise<
      Blob | null
    >(
      (resolve) => {

        canvas.toBlob(
          resolve,
          "image/jpeg",
          quality
        );

      }
    );

  if (!blob) {
    throw new Error(
      "Could not compress image."
    );
  }

  return blob;
}