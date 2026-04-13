import { ChannelProviderAdapter, PublishResult, SyncResult, registerAdapter } from "./registry";
import type { Product, ChannelListing } from "@prisma/client";

class MercadoLibreAdapter implements ChannelProviderAdapter {
  channelId = "mercadolibre";

  async publishProduct(product: Product, overrides: Partial<ChannelListing>): Promise<PublishResult> {
    // In a real scenario, map internal fields to ML JSON, do POST /items
    console.log("[ML Adapter] Publishing product:", product.title);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call

    return {
      success: true,
      externalListingId: `MLA${Math.floor(Math.random() * 100000000)}`,
      externalUrl: "https://articulo.mercadolibre.com.ar/MLA-mock-listing",
    };
  }

  async updateListing(listing: ChannelListing, product: Product): Promise<PublishResult> {
    console.log("[ML Adapter] Updating ML listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 600)); 
    return {
      success: true,
      externalListingId: listing.externalListingId!,
      externalUrl: listing.externalUrl || "",
    };
  }

  async pauseListing(listing: ChannelListing): Promise<PublishResult> {
    console.log("[ML Adapter] Pausing ML listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return { success: true };
  }

  async resumeListing(listing: ChannelListing): Promise<PublishResult> {
    console.log("[ML Adapter] Resuming ML listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return { success: true };
  }

  async syncListing(listing: ChannelListing): Promise<SyncResult> {
    console.log("[ML Adapter] Syncing ML listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 700)); 
    return {
      success: true,
      status: "published",
      syncedPrice: listing.syncedPrice || 0,
      syncedStock: listing.syncedStock || 0
    };
  }
}

registerAdapter(new MercadoLibreAdapter());
