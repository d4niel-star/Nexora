export interface CartItemType {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  // Snapshots
  titleSnapshot: string;
  variantTitleSnapshot: string;
  imageSnapshot: string | null;
  priceSnapshot: number;
  compareAtPriceSnapshot: number | null;
}

export interface CartType {
  id: string;
  storeId: string;
  sessionId: string;
  currency: string;
  status: string;
  items: CartItemType[];
  subtotal: number;
  totalQuantity: number;
}

export interface CartStockIssue {
  itemId: string;
  title: string;
  variantTitle: string;
  requested: number;
  available: number;
}
