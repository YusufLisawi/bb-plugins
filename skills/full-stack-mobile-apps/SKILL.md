---
name: full-stack-mobile-apps
description: Use when planning or building a lean Expo mobile app with a small content API, admin console, landing site, offline use, in-app subscriptions or lifetime purchases, and EAS/Coolify deployment.
---

# Full-Stack Mobile Apps

Use an architecture distilled from a shipped consumer app as a starting point for lean mobile products. Choose each subsystem for the new product; the source app is evidence, not a scaffold to copy unchanged.

## Start here

1. Read [architecture.md](references/architecture.md) to choose the app shape and ownership boundaries. Fill [app-brief.md](templates/app-brief.md) and [decisions.md](templates/decisions.md) for the new product.
2. For Expo screens, state, offline content, or push, read [mobile.md](references/mobile.md). For subscriptions, lifetime purchases, and paywalls, read [payments.md](references/payments.md). For Hono, SQLite, admin tools, Docker, or releases, read [backend-operations.md](references/backend-operations.md).
3. Adapt only relevant files from `templates/`. Keep product names, IDs, domains, prices, assets, and credentials project-specific. Use the installed version's official documentation before implementing library APIs.
4. Use [quality-gates.md](references/quality-gates.md) to verify each implemented slice and launch path.

## Defaults and boundaries

- Use an npm workspace with `apps/mobile`, `services/api`, and optional `apps/web` and `apps/admin` when one small team owns all surfaces.
- Keep mobile navigation/screens in Expo Router, shared UI in `components`, business operations in `lib`, design tokens in `constants`, and wire types in `types`. Keep API routes thin around validation, persistence, and domain functions.
- Publish content through a versioned public API; mutate it through an authenticated admin API. Keep paid entitlement in the store/RevenueCat customer record, never in a local boolean or an unverified client request.
- Add accounts, a server-side entitlement check, or another database when the product needs protected server data, cross-device identity, high write concurrency, or relationships between users. The source app has none of those.
- Keep secrets out of `EXPO_PUBLIC_*`, source control, and static web assets. Public RevenueCat SDK keys and public base URLs may be bundled in the app; admin tokens and provider secrets may not.
- Separate observed source behavior from recommendations. Consult the “improve before reuse” sections before copying a pattern.

## Reference map

| Need | Read |
| --- | --- |
| Stack decisions and data flow | [architecture.md](references/architecture.md) |
| Expo UI, state, caching, updates, push | [mobile.md](references/mobile.md) |
| RevenueCat, freemium, paywall, restore | [payments.md](references/payments.md) |
| Hono, SQLite, admin, deployment, security | [backend-operations.md](references/backend-operations.md) |
| Build and launch verification | [quality-gates.md](references/quality-gates.md) |

Source: `spark-cards` repository, inspected 2026-09-28. Do not assume its current package versions are future defaults.
