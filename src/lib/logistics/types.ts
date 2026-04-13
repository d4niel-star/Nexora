export type CarrierStatus = "unfulfilled" | "preparing" | "ready_to_ship" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "failed_delivery" | "returned" | "cancelled";

export interface ShipmentDetails {
  weight?: number; // kg
  width?: number; // cm
  height?: number; // cm
  length?: number; // cm
}

export interface CreateShipmentRequest {
  orderId: string;
  orderNumber: string;
  recipient: {
    name: string;
    email: string;
    phone?: string | null;
    document?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  details?: ShipmentDetails;
  serviceLevel?: string;
}

export interface CreateShipmentResponse {
  shipmentId: string;
  trackingCode: string;
  trackingUrl?: string;
  labelUrl?: string;
  status: CarrierStatus;
  carrierFee?: number;
  estimatedDays?: number;
}

export interface TrackingEvent {
  status: CarrierStatus;
  description: string;
  location?: string;
  timestamp: string;
}

export interface TrackingStatusResponse {
  trackingCode: string;
  status: CarrierStatus;
  events: TrackingEvent[];
  updatedAt: string;
}

export interface WebhookPayload {
  externalEventId: string;
  trackingCode: string;
  status: CarrierStatus;
  rawPayload: any;
}

export interface LogisticsProvider {
  id: string; // e.g. 'mock_carrier', 'andreani'
  name: string;
  isAvailable(): boolean;
  createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse>;
  getTrackingStatus(shipmentId: string, trackingCode: string): Promise<TrackingStatusResponse>;
  parseWebhook?(request: Request): Promise<WebhookPayload>;
}
