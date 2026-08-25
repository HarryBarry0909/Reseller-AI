import { createClient } from "@/lib/supabase/client";

export async function saveListingToSupabase(listing: {
  id?: string;
  title: string;
  description?: string | null;
  price?: number | null;
  purchase_price?: number | null;
  estimated_profit?: number | null;
  status?: string;
  marketplace?: string;
  category?: string | null;
  condition?: string | null;
  quantity?: number;
  quantity_sold?: number;
  image_set_id?: string | null;
  image_count?: number;
  product?: unknown;
  item_specifics?: unknown;
  selling?: unknown;
  shipping?: unknown;
  sold_price?: number | null;
  sold_at?: string | null;
}) {
  const supabase = createClient();

  // Get the currently logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be logged in to save a listing.");
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...(listing.id ? { id: listing.id } : {}),

      user_id: user.id,

      title: listing.title,
      description: listing.description ?? null,

      price: listing.price ?? null,
      purchase_price: listing.purchase_price ?? null,
      estimated_profit: listing.estimated_profit ?? null,

      status: listing.status ?? "Draft",
      marketplace: listing.marketplace ?? "eBay",

      category: listing.category ?? null,
      condition: listing.condition ?? null,

      quantity: listing.quantity ?? 1,
      quantity_sold: listing.quantity_sold ?? 0,

      image_set_id: listing.image_set_id ?? null,
      image_count: listing.image_count ?? 0,

      product: listing.product ?? null,
      item_specifics: listing.item_specifics ?? null,
      selling: listing.selling ?? null,
      shipping: listing.shipping ?? null,

      sold_price: listing.sold_price ?? null,
      sold_at: listing.sold_at ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}