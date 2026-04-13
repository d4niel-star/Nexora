import type { Product, ChannelListing } from "@prisma/client";

export interface PublishResult {
  success: boolean;
  externalListingId?: string;
  externalUrl?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  status: string;
  syncedPrice?: number;
  syncedStock?: number;
  error?: string;
}

export interface ChannelProviderAdapter {
  channelId: string;
  publishProduct(product: Product, overrides: Partial<ChannelListing>): Promise<PublishResult>;
  updateListing(listing: ChannelListing, product: Product): Promise<PublishResult>;
  pauseListing(listing: ChannelListing): Promise<PublishResult>;
  resumeListing(listing: ChannelListing): Promise<PublishResult>;
  syncListing(listing: ChannelListing): Promise<SyncResult>;
}

const adapters = new Map<string, ChannelProviderAdapter>();

export function registerAdapter(adapter: ChannelProviderAdapter) {
  adapters.set(adapter.channelId, adapter);
}

export function getAdapter(channelId: string): ChannelProviderAdapter {
  const adapter = adapters.get(channelId);
  if (!adapter) {
    throw new Error(`Channel provider not found for: ${channelId}`);
  }
  return adapter;
}
