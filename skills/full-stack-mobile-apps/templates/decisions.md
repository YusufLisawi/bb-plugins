# Architecture decisions

| Decision | Choice | Why it fits this product | Revisit when |
| --- | --- | --- | --- |
| Identity | Anonymous / accounts | | |
| Data | Bundled / public API / protected API | | |
| Persistence | SQLite / managed DB | | |
| Payments | None / store + RevenueCat / other | | |
| Paid authorization | Client entitlement / server verified | | |
| Admin | CLI / static console / full app | | |
| Offline | None / cached reads / full sync | | |
| Updates | Store only / OTA + store floor | | |
| Deployment | Compose/Coolify / other | | |

## Domain and contracts
- Entities and IDs:
- Public routes and response shapes:
- Private routes and auth:
- Ownership of each state value (device, API, store):
- Failure behavior when network, store, or API is unavailable:

## Risks and controls
- Secrets and access:
- Backup and restore drill:
- Subscription test cases:
- API compatibility policy:
