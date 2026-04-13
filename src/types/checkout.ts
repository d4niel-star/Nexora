export interface CheckoutDraftType {
  id: string;
  cartId: string;
  storeId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  document: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  shippingMethodId: string | null;
  shippingMethodLabel: string | null;
  shippingCarrier: string | null;
  shippingEstimate: string | null;
  paymentMethod: string | null;
  subtotal: number;
  shippingAmount: number;
  total: number;
  status: string;
}
