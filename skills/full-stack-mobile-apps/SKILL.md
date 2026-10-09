---
name: full-stack-mobile-apps
description: Use when planning or scaffolding a lean Expo mobile app with a Hono content API, SQLite, admin console, landing site, offline use, in-app purchases, or EAS deployment.
---

# Full-Stack Mobile Apps

Use an architecture distilled from a shipped consumer app as a starting point for lean mobile products. Choose each subsystem for the new product; the source app is evidence, not a scaffold to copy unchanged.

## Start here

1. Read `references/architecture.md` to choose the app shape and ownership boundaries. Fill `templates/app-brief.md` and `templates/decisions.md` for the new product.
2. For Expo screens, state, offline content, or push, read `references/mobile.md`. For subscriptions, lifetime purchases, and paywalls, read `references/payments.md`. For Hono, SQLite, admin tools, Docker, or releases, read `references/backend-operations.md`.
3. Adapt only relevant files from `templates/`. Keep product names, IDs, domains, prices, assets, and credentials project-specific. Use the installed version's official documentation before implementing library APIs.
4. Use `references/quality-gates.md` to verify each implemented slice and launch path.

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
| Stack decisions and data flow | `references/architecture.md` |
| Expo UI, state, caching, updates, push | `references/mobile.md` |
| RevenueCat, freemium, paywall, restore | `references/payments.md` |
| Hono, SQLite, admin, deployment, security | `references/backend-operations.md` |
| Build and launch verification | `references/quality-gates.md` |

## Working starter

For a new app using this shape, run the deterministic generator from this skill directory:

```bash
node scripts/create-app.mjs --out /path/to/new-app --slug field-notes --name "Field Notes" --bundle-id com.example.fieldnotes
```

It copies `starter/`, creates a local random admin token, and leaves an example item flow through API, admin, cache, and mobile. Read `starter/README.md` before adapting it. The starter is a versioned snapshot; check Expo compatibility and install dependencies for the new project. Add RevenueCat from the payment reference only when the product needs in-app purchases.
