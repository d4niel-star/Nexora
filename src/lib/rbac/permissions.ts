// ─── Nexora RBAC: Permission Registry ────────────────────────────────
// Single source of truth for who can do what. Permissions are derived
// from roles via PERMISSIONS_BY_ROLE. Owners always have ALL permissions.
//
// Adding a new sensitive operation? Add a permission key here, gate the
// server action with requirePermission(), and (optionally) add a UI
// disabled state via hasPermission(). No string-matching, no leaks.

export const ALL_PERMISSIONS = [
  // Catalog
  "catalog.read",
  "catalog.write",
  "catalog.delete",
  "catalog.bulk",
  // Inventory
  "inventory.read",
  "inventory.adjust",
  "inventory.bulk",
  // Orders
  "orders.read",
  "orders.fulfill",
  "orders.refund",
  "orders.cancel",
  "orders.export",
  "orders.bulk",
  // Customers
  "customers.read",
  "customers.write",
  "customers.export",
  // Storefront / theme
  "storefront.read",
  "storefront.publish",
  "theme.publish",
  // Apps & automations
  "apps.install",
  "apps.uninstall",
  "automation.read",
  "automation.toggle",
  "automation.config",
  // Billing & payouts
  "billing.read",
  "billing.write",
  "payouts.request",
  // Staff & team
  "staff.read",
  "staff.invite",
  "staff.manage", // suspend, reactivate, change role
  "staff.remove",
  // Operations
  "operations.read",
  "operations.retry",
  "operations.cancel",
  // ─── Phase 7C: Intelligence + CRM + Marketing ───
  "analytics.view",          // Read access to /admin/analytics
  "analytics.export",        // Heavy analytics exports (rate-limited)
  "exports.manage",          // CSV exports of customers / orders
  "customer.notes.manage",   // Create / edit / delete CRM notes
  "customer.tags.manage",    // Create / remove tags
  "customer.tasks.manage",   // Create / assign / complete tasks
  "marketing.read",          // Read campaigns
  "marketing.manage",        // Create / send campaigns
  "crm.manage",              // Aggregate flag for CRM mutations (notes/tags/tasks)
  // System / dangerous
  "system.dangerous", // Owner-only escape hatch (delete store, etc.)
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export type StaffRole = "owner" | "admin" | "manager" | "support" | "analyst";

// ─── Role → Permission mapping ───
// "owner" is computed by always returning true; we still list it for
// completeness so listing-by-role tools render correctly.
export const PERMISSIONS_BY_ROLE: Record<StaffRole, ReadonlyArray<Permission>> = {
  owner: ALL_PERMISSIONS,
  admin: [
    "catalog.read", "catalog.write", "catalog.delete", "catalog.bulk",
    "inventory.read", "inventory.adjust", "inventory.bulk",
    "orders.read", "orders.fulfill", "orders.refund", "orders.cancel", "orders.export", "orders.bulk",
    "customers.read", "customers.write", "customers.export",
    "storefront.read", "storefront.publish", "theme.publish",
    "apps.install", "apps.uninstall",
    "automation.read", "automation.toggle", "automation.config",
    "billing.read",
    "staff.read", "staff.invite", "staff.manage", "staff.remove",
    "operations.read", "operations.retry", "operations.cancel",
    "analytics.view", "analytics.export",
    "exports.manage",
    "customer.notes.manage", "customer.tags.manage", "customer.tasks.manage",
    "marketing.read", "marketing.manage",
    "crm.manage",
  ],
  manager: [
    "catalog.read", "catalog.write", "catalog.bulk",
    "inventory.read", "inventory.adjust",
    "orders.read", "orders.fulfill", "orders.cancel", "orders.export",
    "customers.read", "customers.write",
    "storefront.read",
    "automation.read", "automation.toggle",
    "operations.read",
    "analytics.view",
    "exports.manage",
    "customer.notes.manage", "customer.tags.manage", "customer.tasks.manage",
    "marketing.read",
    "crm.manage",
  ],
  support: [
    "catalog.read",
    "inventory.read",
    "orders.read", "orders.fulfill", "orders.cancel",
    "customers.read", "customers.write",
    "automation.read",
    "customer.notes.manage", "customer.tags.manage", "customer.tasks.manage",
    "crm.manage",
  ],
  analyst: [
    "catalog.read",
    "inventory.read",
    "orders.read", "orders.export",
    "customers.read", "customers.export",
    "storefront.read",
    "automation.read",
    "billing.read",
    "operations.read",
    "analytics.view", "analytics.export",
    "exports.manage",
    "marketing.read",
  ],
};

export function rolePermissions(role: StaffRole): ReadonlyArray<Permission> {
  return PERMISSIONS_BY_ROLE[role] ?? [];
}

export function roleHasPermission(role: StaffRole, perm: Permission): boolean {
  if (role === "owner") return true;
  return PERMISSIONS_BY_ROLE[role]?.includes(perm) ?? false;
}
