# __APP_NAME__ starter

Generated from the `full-stack-mobile-apps` skill. The `items` entity is an example vertical slice: SQLite → Hono public/admin API → cached Expo screen and admin UI. Replace it with the new product's domain.

## Run locally

1. Use Node 22 (`nvm use` if available), then `npm install` (creates `package-lock.json`, required by the API Dockerfile).
2. `npm run api:dev` starts the API at `http://localhost:3000`. The generated `.env` contains a local admin token.
3. In another terminal, `npm run mobile` starts Expo. For iOS simulator, the generated `apps/mobile/.env` targets the API at port 3000. For Android emulator use `http://10.0.2.2:3000`; for a physical device use a reachable LAN/HTTPS URL.
4. For web/admin containers, `docker compose up --build` uses port 3090 for API, 8090 for web, and localhost-only 8091 for admin. Change `apps/mobile/.env` to `http://localhost:3090` when using Compose. Run `npm run smoke` while Compose is up.

The admin UI is at `http://localhost:8091`. Paste the `ADMIN_TOKEN` from your local `.env`; it stays in browser memory, not local storage. Add one item and refresh the mobile screen to verify the full path.

## Before deploying

- Replace example content, landing copy, legal placeholders, UI tokens, app IDs, and bundle IDs with product-specific values.
- Put a new admin token in deployment secrets, keep the admin behind a private/authenticated edge, and back up the SQLite volume consistently.
- Validate Expo/native dependency compatibility and run `cd apps/mobile && npx expo install --check` after install. Create an EAS project with `eas init`; set EAS environment values for each build profile. The starter includes development, preview, and production channels. Add `expo-dev-client` when native modules require development builds, and run `eas update:configure` before using OTA updates.
- Add RevenueCat only if the app sells digital access: use the skill's payment reference and `templates/revenuecat-service.ts`, then test in native store builds. Keep `EXPO_PUBLIC_MOCK_PREMIUM=0` in production.
- Public API content is accessible without buying. Add accounts and server-side entitlement checks if the content must be protected.
