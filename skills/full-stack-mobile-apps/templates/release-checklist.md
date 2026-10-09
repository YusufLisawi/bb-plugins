# Release checklist: <app> <version>

- [ ] Free core journey and offline recovery verified on iOS and Android.
- [ ] Store offering, localized prices, purchase, cancellation, restore, renewal, and lifetime tested where applicable.
- [ ] `EXPO_PUBLIC_MOCK_PREMIUM=0` in production build; no secret is exposed through client env or static assets.
- [ ] Terms, privacy, support, subscription disclosures, and store listing match shipped behavior.
- [ ] API migration, backup, restore, health probe, and admin unauthorized check pass.
- [ ] Production smoke probes are read-only.
- [ ] EAS runtime/channel matches the binary; OTA tested on compatible release build.
- [ ] Icons, screenshots, bundle IDs, domain links, push permissions, and store credentials reviewed.
- [ ] Rollout owner and rollback action recorded.
