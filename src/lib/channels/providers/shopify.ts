import { ChannelProviderAdapter, PublishResult, SyncResult, registerAdapter } from "./registry";
import type { Product, ChannelListing } from "@prisma/client";

class ShopifyAdapter implements ChannelProviderAdapter {
  channelId = "shopify";

  async publishProduct(product: Product, overrides: Partial<ChannelListing>): Promise<PublishResult> {
    console.log("[Shopify Adapter] Publishing product via GraphQL:", product.title);
    await new Promise(resolve => setTimeout(resolve, 600)); 

    return {
      success: true,
      externalListingId: `gid://shopify/Product/${Math.floor(Math.random() * 10000000000)}`,
      externalUrl: "https://shopify.com/mock/products/mock-listing",
    };
  }

  async updateListing(listing: ChannelListing, product: Product): Promise<PublishResult> {
    console.log("[Shopify Adapter] Updating Shopify listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return {
      success: true,
      externalListingId: listing.externalListingId!,
      externalUrl: listing.externalUrl || "",
    };
  }

  async pauseListing(listing: ChannelListing): Promise<PublishResult> {
    console.log("[Shopify Adapter] Pausing Shopify listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 400)); 
    return { success: true };
  }

  async resumeListing(listing: ChannelListing): Promise<PublishResult> {
    console.log("[Shopify Adapter] Resuming Shopify listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 400)); 
    return { success: true };
  }

  async syncListing(listing: ChannelListing): Promise<SyncResult> {
    console.log("[Shopify Adapter] Syncing Shopify listing:", listing.externalListingId);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    return {
      success: true,
      status: "published",
      syncedPrice: listing.syncedPrice || 0,
      syncedStock: listing.syncedStock || 0
    };
  }
}

registerAdapter(new ShopifyAdapter());
