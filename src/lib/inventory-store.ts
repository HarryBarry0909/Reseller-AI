export type InventoryStatus =
  | "Draft"
  | "Ready to List"
  | "Listed"
  | "Sold"
  | "Unsold"
  | "Removed";

export type InventoryItem = {
  id: string;
  userId?: string | null;

  createdAt: string;
  updatedAt: string;

  // Main inventory information
  status: InventoryStatus;

  // Images
  imageSetId?: string | null;
  imageCount: number;

  // Product information
  product: Record<string, unknown>;

  // Listing information
  listing: {
    title: string;
    description: string;
  };

  category?: string | null;
  condition?: string | null;

  itemSpecifics?: Record<string, unknown>;

  // Selling information
  selling?: Record<string, unknown>;

  // Shipping information
  shipping?: Record<string, unknown>;

  // Dispatch / packaging / returns
  dispatch?: string | null;
  packaging?: Record<string, unknown>;
  returns?: Record<string, unknown>;

  sellerStatus?: string | null;
  additionalNotes?: string | null;

  // Financial information
  purchasePrice: number;
  estimatedProfit: number;
  estimatedROI: number | null;

  // Quantity
  quantity: number;
  quantitySold: number;

  // Sale information
  soldPrice: number | null;
  soldAt: string | null;
};

const STORAGE_KEY = "reseller-ai-inventory";

function isBrowser() {
  return typeof window !== "undefined";
}

export function createInventoryId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function getInventory(): InventoryItem[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInventory(items: InventoryItem[]) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items)
  );

  window.dispatchEvent(
    new CustomEvent("reseller-ai-inventory-changed")
  );
}

export function addInventoryItem(
  item: InventoryItem
) {
  const items = getInventory();

  items.unshift(item);

  saveInventory(items);

  return item;
}

export function getInventoryItem(
  id: string
) {
  return getInventory().find(
    (item) => item.id === id
  ) ?? null;
}

export function updateInventoryItem(
  id: string,
  updates: Partial<InventoryItem>
) {
  const items = getInventory();

  const index = items.findIndex(
    (item) => item.id === id
  );

  if (index === -1) {
    return null;
  }

  items[index] = {
    ...items[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveInventory(items);

  return items[index];
}

export function deleteInventoryItem(
  id: string
) {
  const items = getInventory();

  const filtered = items.filter(
    (item) => item.id !== id
  );

  saveInventory(filtered);
}

export function getListedInventory() {
  return getInventory().filter(
    (item) => item.status === "Listed"
  );
}

export function getSoldInventory() {
  return getInventory().filter(
    (item) => item.status === "Sold"
  );
}