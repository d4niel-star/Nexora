export type SettingsStatus = "active" | "inactive" | "pending" | "verified" | "error" | "attention" | "configured" | "not_configured" | "secure" | "risk";

export type UserRole = "owner" | "admin" | "operations" | "marketing" | "support";

export interface AccountInfo {
  businessName: string;
  email: string;
  phone: string;
  country: string;
  currency: string;
  language: string;
  timezone: string;
  status: SettingsStatus;
  accountId: string;
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: SettingsStatus;
  lastAccess: string;
  avatar: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  status: SettingsStatus;
  account: string;
  currency: string;
  lastVerified: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  baseCost: number;
  estimatedDays: string;
  zones: string[];
  status: SettingsStatus;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  country: string;
  region: string;
  status: SettingsStatus;
  lastUpdated: string;
}

export interface NotificationEvent {
  id: string;
  event: string;
  description: string;
  email: boolean;
  push: boolean;
  dashboard: boolean;
  frequency: "instant" | "daily" | "weekly";
  status: SettingsStatus;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: SettingsStatus;
  description: string;
}

export interface BillingInfo {
  plan: string;
  nextCharge: string;
  status: SettingsStatus;
  paymentMethod: string;
  invoices: Invoice[];
}

export interface SecuritySession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface SecurityInfo {
  twoFactorEnabled: boolean;
  lastLogin: string;
  sessions: SecuritySession[];
  passwordStrength: "weak" | "medium" | "strong";
}

export interface Preferences {
  language: string;
  dateFormat: string;
  currencyFormat: string;
  density: "comfortable" | "compact";
  emailDigest: boolean;
  darkMode: boolean;
}

export interface SettingsSummary {
  plan: string;
  status: SettingsStatus;
  usersCount: number;
  paymentsConfigured: number;
  shippingConfigured: number;
  securityScore: "secure" | "risk" | "attention";
  nextInvoice: string;
  nextInvoiceAmount: number;
  pendingAlerts: number;
}
