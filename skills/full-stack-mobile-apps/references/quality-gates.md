# Build and launch gates

These gates verify product behavior, not mere command success. Adjust to the app brief and keep test data isolated from production.

## Before implementation

- Product journey, free boundary, account need, offline requirement, and source of truth for each data value are recorded in `templates/app-brief.md` and `templates/decisions.md`.
- IDs, domains, entitlement name, offering/products, API contracts, public vs private env values, and legal/support URLs are chosen for this app.
- Versioned Expo documentation and current RevenueCat/store guidance are checked for the selected dependency versions.

## Each vertical slice

- API validates input, uses prepared SQL, returns stable JSON/errors, and checks authorization on writes.
- Mobile handles loading, empty, offline/cache, retry, and stale data. Cache payloads are validated and versioned.
- Admin changes appear in API and mobile; editor previews match client tokens.
- A meaningful test covers a failure or boundary that could break the user journey. Typecheck and build the touched surface. Avoid tests that merely duplicate the implementation.
- Accessibility: labels, focus, tap targets, dynamic text, contrast, and screen reader order are checked for new UI.

## Payments

- Run the matrix in `payments.md` on real platform test environments.
- Check displayed price/period against store metadata, restore, manage, Terms/Privacy, cancellation, and unavailable offering states.
- Confirm production bundle has mock unlock off. Check all premium entry points use the same entitlement selector.
- If server content is protected, test an unpaid direct API request is rejected by server-side authorization.

## Deployment and release

- API builds; migration on an empty DB and an upgraded DB succeeds. Backup and restore have been exercised.
- Read-only `/health`, public endpoint, legal pages, admin unauthorized response, and protected admin access work in the deployed environment.
- EAS development/preview/production profiles use distinct channels and correct public env. Native changes cause a compatible runtime/build boundary; OTA works on a release build.
- App IDs, assets, push entitlements, privacy/terms/support URLs, store products, and review disclosures match the submitted binary.
- No secrets/private keys/DB files are staged. Production smoke probes do not mutate live data.

## After release

- Observe API error rate, storage/backup status, push failures, purchase/restore failures, and update failures.
- Verify one real free journey and one purchase/restore journey on each released platform.
- Record any departure from the template in `decisions.md` for the next maintainer.
