// Adapt entitlement ID and connect CustomerInfo to a provider with
// unknown/free/premium states. Use only in native development/store builds.
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

const ENTITLEMENT_ID = "premium";
let configured = false;

export function configureBilling(): boolean {
  if (configured) return true;
  if (Platform.OS !== "ios" && Platform.OS !== "android") return false;
  const apiKey = Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
  if (!apiKey || apiKey.includes("REPLACE_ME")) return false;
  Purchases.configure({ apiKey });
  configured = true;
  return true;
}

export function hasEntitlement(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

export async function loadCustomerInfo(): Promise<CustomerInfo> {
  if (!configured) throw new Error("Billing is not configured");
  return Purchases.getCustomerInfo();
}

export async function loadPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  return (await Purchases.getOfferings()).current?.availablePackages ?? [];
}

export async function buyPackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  if (!configured) throw new Error("Billing is not configured");
  return (await Purchases.purchasePackage(pkg)).customerInfo;
}

export async function restoreFromUserAction(): Promise<CustomerInfo> {
  if (!configured) throw new Error("Billing is not configured");
  return Purchases.restorePurchases();
}
