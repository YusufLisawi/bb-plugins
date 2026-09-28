# Expo mobile pattern

## Source layout

`apps/mobile/app/` is Expo Router navigation: `_layout.tsx` wires fonts, splash, gesture root, theme and purchase providers, stack screens, update prompt, and push registration. `index.tsx` loads the collection, `play/[id].tsx` handles the core interaction, `paywall.tsx` sells/ restores access, and `settings.tsx` exposes accountless purchase and app controls. `components/` holds reusable display widgets. `lib/` holds API, purchase, local storage, sharing, push, and updates. `constants/` holds design tokens and URLs. `types.ts` holds mobile wire types.

Prefer this ownership split over a giant screen. Keep screen files focused on orchestration, state transitions, and layout; move durable rules into pure domain helpers and side effects into `lib` modules. A provider is warranted for state used across screens (theme and entitlement); local screen state should remain local. Use path aliases and strict TypeScript.

## Data and offline behavior

`lib/api.ts` uses network-first reads, writes successful data to versioned AsyncStorage keys, falls back to cache on network failure, and raises a user-facing error if neither exists. Home prefetches pack questions with `Promise.allSettled`, so one failed pack does not block the rest. It refetches on focus and app foreground. Saved cards, theme, pack order, and preview counts are device-only state with versioned storage keys.

For a new app, define cache schema/version, stale-content behavior, invalidation, and corrupt-cache handling. Validate fetched JSON at runtime before caching. Use bounded prefetch when data sets grow; do not launch one request per item without a concurrency limit. Ensure screens show loading, empty, offline, retry, and partial data states.

## Design system

The source uses named themes in `constants/themes.ts`, semantic tokens resolved by `ThemeContext`, plus spacing/radius/type in `constants/theme.ts`. The API stores token keys (`colorKey`, `inkKey`, `iconKey`) instead of arbitrary client styles, letting editors change content appearance without changing the mobile renderer. Font loading and splash timing live in the root layout. Native safe-area insets and motion are handled at screen level.

Make the new product's own visual system. Keep token naming stable between admin preview and mobile rendering. Validate keys server-side. Check contrast and accessibility, including buttons, disabled states, dark theme, and dynamic type.

## Optional platform features

- **Push:** `lib/notifications.ts` asks permission, gets an Expo token using the EAS project ID, and POSTs it to `/v1/push/register`. In a new app, ask permission in context, handle denied status, token rotation, stale token cleanup, abuse controls, and user preferences. Do not request at launch merely because the source does.
- **OTA:** `lib/updates.ts` checks EAS Update in production, downloads, and reloads after modal dismissal. The API stores `minAppVersion` for a required store upgrade. Test with release builds, compatible runtime versions, offline startup, failed downloads, and app-store URLs. Never assume a JS update can add native code.
- **Sharing:** `ShareCard.tsx` / `lib/share.ts` render branded content and share an image. Add only if it supports the product's core loop.

## Improve before reuse

The source’s `PurchasesProvider` marks itself ready before customer info arrives, so a paid user may briefly appear free. Avoid irreversible gating or purchase prompts during this unknown entitlement state. Its local free-preview counter can be reset; it is acceptable only for a soft, public-content preview. Saved cards and theme are not synchronized across devices. These choices are product constraints, not universal defaults.

Relevant source: `apps/mobile/app/_layout.tsx`, `lib/api.ts`, `lib/ThemeContext.tsx`, `lib/notifications.ts`, `lib/updates.ts`, `constants/themes.ts`.
