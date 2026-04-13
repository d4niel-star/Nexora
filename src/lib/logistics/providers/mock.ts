import { CreateShipmentRequest, CreateShipmentResponse, LogisticsProvider, TrackingStatusResponse, WebhookPayload } from "../types";

export class MockCarrierProvider implements LogisticsProvider {
  id = "mock_carrier";
  name = "Mock Carrier Pro";

  isAvailable(): boolean {
    return true;
  }

  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResponse> {
    // Generate deterministic but random-looking mock ID
    const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
    const trackingCode = `MC-${request.orderNumber.replace('#', '')}-${randomHex}`;
    
    return {
      shipmentId: `ship_${randomHex}`,
      trackingCode,
      trackingUrl: `https://mockcarrier.com/track/${trackingCode}`,
      status: "ready_to_ship",
      carrierFee: 5500,
      estimatedDays: 3,
    };
  }

  async getTrackingStatus(shipmentId: string, trackingCode: string): Promise<TrackingStatusResponse> {
    const rawEvents = [
      {
        status: "ready_to_ship" as const,
        description: "El paquete está listo para ser recolectado por el correo.",
        location: "Depósito Origen",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        status: "in_transit" as const,
        description: "El paquete ingresó en nuestra red logística central.",
        location: "Plataforma Logística",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        status: "out_for_delivery" as const,
        description: "El paquete se encuentra en el vehículo repartidor.",
        location: "Sucursal Destino",
        timestamp: new Date().toISOString()
      }
    ];

    return {
      trackingCode,
      status: "out_for_delivery",
      events: rawEvents,
      updatedAt: new Date().toISOString(),
    };
  }

  async parseWebhook(request: Request): Promise<WebhookPayload> {
    const rawPayload = await request.json();
    
    // Validate simple auth (not required for mock really, but good practice demonstration)
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.MOCK_LOGISTICS_SECRET || "mock-secret"}`) {
      throw new Error("Unauthorized logistics webhook");
    }

    if (!rawPayload.eventId || !rawPayload.trackingCode || !rawPayload.status) {
      throw new Error("Invalid payload format from mock carrier");
    }

    return {
      externalEventId: String(rawPayload.eventId),
      trackingCode: String(rawPayload.trackingCode),
      status: String(rawPayload.status) as any,
      rawPayload,
    };
  }
}
