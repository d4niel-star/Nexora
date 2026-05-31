// ─── Global Search Types (Phase 7D.1) ────────────────────────────────

export type SearchEntityType =
  | "order"
  | "customer"
  | "product"
  | "variant"
  | "staff"
  | "job"
  | "event"
  | "inventory";

export interface SearchHit {
  type: SearchEntityType;
  id: string;
  /** Primary display label (truncated). */
  title: string;
  /** Secondary metadata line (status, dates, prices, etc.). */
  subtitle?: string;
  /** Tertiary hint (entity-type tag). */
  meta?: string;
  /** Deep-link URL into the admin panel. */
  href: string;
  /** Internal score used for cross-type ranking. */
  score: number;
  /** Match span info for highlighting in the UI. */
  match?: { field: string; value: string };
}

export interface SearchResult {
  query: string;
  /** Hits grouped by entity type, each pre-sorted by score desc. */
  groups: Record<SearchEntityType, SearchHit[]>;
  totalHits: number;
  truncated: boolean;
}

export const MAX_QUERY_LENGTH = 80;
export const MAX_HITS_PER_TYPE = 8;
