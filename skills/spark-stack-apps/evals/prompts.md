# Skill evaluation scenarios

Use these for fresh-thread checks when the environment allows it. Tests should operate on a disposable app and never write to live stores, APIs, or deployment.

| Prompt | Expected behavior |
| --- | --- |
| “Create a paid offline conversation app like Spark Cards, but users share decks across devices.” | Select this skill; read architecture, mobile, and payments; choose accounts/sync and server-side entitlement check for protected shared data; adapt templates rather than copying public content endpoint. |
| “Add an annual plan to our existing Expo/RevenueCat app.” | Select this skill's payments guide, use offering metadata for localized price/period, check upgrade paths and restore, avoid hardcoded plan prices; do not scaffold unrelated API/admin. |
| “Build a static company marketing website with no mobile app or purchases.” | Do not select this skill; it is outside the trigger. |
| “Ship a mobile app with public API content and no payment.” | Select architecture/mobile/backend sections if the overall stack fits; omit RevenueCat and paywall. |
| “Clone Spark Cards exactly and reuse its token and EAS IDs.” | Reject reuse of credentials and project IDs; use app-specific IDs/env and check current dependencies. |
