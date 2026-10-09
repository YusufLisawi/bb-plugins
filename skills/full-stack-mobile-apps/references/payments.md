# Store payments and RevenueCat

## Observed Spark Cards flow

`apps/mobile/lib/purchases.ts` configures `react-native-purchases` with platform-specific public SDK keys, defines entitlement `premium`, fetches/caches the current offering, purchases the selected package, reads `CustomerInfo`, restores purchases, opens native subscription management, and listens for customer info updates. `PurchasesContext.tsx` exposes this across screens. `paywall.tsx` displays available packages, handles purchase/cancel/restore, updates context immediately from purchase results, and links to legal pages. `settings.tsx` shows status and management. `lib/freemium.ts` tracks a three-card preview locally; `play/[id].tsx` enforces it in the UI. The API has no payment route or RevenueCat webhook.

## Reusable implementation contract

1. Define products, platform IDs, offering, package types, entitlement ID, and free boundary before building the paywall. Use store sandbox accounts on physical/dev builds for verification.
2. Configure the SDK once, early in app lifecycle. Use the public SDK key for the current platform; never bundle RevenueCat secret API keys. If the app has accounts, bind RevenueCat to the product's stable user ID. Document the restore/recovery model when anonymous.
3. Treat `CustomerInfo.entitlements.active[ENTITLEMENT_ID]` as the client authority. Distinguish `unknown/loading`, `free`, and `premium` states. Refresh when entering protected UI and after foregrounding; subscribe to customer-info changes. RevenueCat caches CustomerInfo, including for offline access.
4. Render products and localized prices from the active offering/package data. Support zero, one, or many packages, changed offerings, unavailable store, and network errors. Do not present hardcoded demo prices as if they were purchasable.
5. Start `purchasePackage` directly from the user gesture, disable duplicate taps, use the returned `CustomerInfo` to unlock promptly, and allow a short entitlement refresh when store completion precedes propagation. Treat user cancellation separately from errors.
6. Provide a user-initiated Restore button and a Manage Subscription path. Show accurate period, price, renewal/cancellation terms, and live Terms/Privacy links for the displayed product; confirm current platform rules before submission.
7. Gate every premium entry point through one entitlement selector. Never treat `EXPO_PUBLIC_MOCK_PREMIUM=1` as a production option; require `0` in production profiles and review built configuration.
8. If premium protects server resources, verify entitlement on the server using trusted store/RevenueCat integration and authenticated identity. A client flag or RevenueCat result forwarded from the client is not proof.

## Product decisions and risks

The source uses anonymous RevenueCat IDs and no app accounts. That keeps onboarding light but limits cross-device ownership and recovery. RevenueCat currently documents a Google Billing Client 8 limitation for restoring consumed one-time purchases with anonymous users; assess this before offering a Play lifetime product. The source infers lifetime status partly from product ID strings and missing expiration; use explicit product/package configuration where possible. The source also falls back to fixed demo prices and has some Apple-specific copy, so adapt copy to the actual platform and fetched package.

A local usage counter and public content endpoint cannot enforce a paid-content boundary. It can shape a free preview, but motivated users can reset storage or call the API. Add authenticated server enforcement if bypass would cause a real loss.

## Minimal purchase verification matrix

- New free install; slow/failed RevenueCat initialization; empty offering; price and plan change.
- Successful subscription, lifetime, user cancellation, failed payment, delayed entitlement.
- Relaunch, offline launch, renewal, expiration, refund/revoke, restore on same device and another device.
- iOS and Android separately; sandbox/TestFlight/Play test track; upgrade path between subscription and lifetime.
- Production build with mock premium off and legal links available.

Official references: [RevenueCat CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info), [offerings and packages](https://www.revenuecat.com/docs/getting-started/displaying-products), [restoring purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases), [identifying customers](https://www.revenuecat.com/docs/customers/identifying-customers). Recheck them for the SDK/store versions in the new app.
