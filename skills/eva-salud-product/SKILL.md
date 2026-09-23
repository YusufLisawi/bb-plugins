---
name: eva-salud-product
description: EVA Salud product knowledge from the September 2026 25-article editorial PDF, checked against app and ERP source. Use for insurance benefits, limits, pricing, family eligibility, app and AI booking explanations, marketplace boundaries, EVA Salud ad scripts, SEO copy, or product claim review. For visual identity alone use eva-brand.
---

# EVA Salud product knowledge

Use this skill to explain **what the family policy covers, what costs extra, and what the app does**. It preserves the user's 53-page, 25-article September 2026 PDF as an attributed editorial source. The editorial file is a briefing, not the signed policy or a live quote.

## Read only what the request needs

| Request | Read |
| --- | --- |
| Insurance benefits, limits, pricing, eligibility | `references/product-and-coverage.md` |
| Appointment booking, voice AI, app and other services | `references/app-ai-and-ecosystem.md` |
| Ads, SEO articles, comparisons, article topics | `references/editorial-library.md` |
| Any exact numeric or public coverage claim | `references/claim-audit.md` |
| Exact wording or full source context | `references/source-extract.md` or `assets/original.pdf` |

For EVA visual identity and Castilian voice, also use `eva-brand`. For video production, also use `eva-video-ads`. This skill owns product facts and claim boundaries, not graphic design or rendering.

## Core model

- **Policy:** EVA Salud Familiar is a family medical insurance product **underwritten by Nueva Mutua Sanitaria (NMS)** and distributed under the EVA Salud brand by Comparador Eva Correduría de Seguros, S.L. Keep insurer, distributor and brand distinct.
- **Price and household:** The PDF and internal product copy use **34,40 €/month for up to eight insured people**. Treat the price as a reference until the current offer and policy wording are confirmed.
- **Cover:** Explain separately (1) included consultations without a session limit in seven named specialties, (2) included services with annual limits, (3) telemedicine and dental benefits, and (4) services bought separately through the marketplace. Do not call everything in the app “covered.”
- **AI and app:** Users can describe a need and submit a booking request. EVA helps identify a specialty, contact centres when supported, and track the result. The AI does not diagnose, prescribe, choose treatment, or guarantee an immediate appointment.
- **Other app services:** Additional insurance comparisons, mobile/fibre and shopping are separate offers with their own contracts and prices, not family-policy benefits.

## Decision rules

1. For an individual's entitlement or remaining allowance, use their current policy and usage record. The editorial PDF cannot answer a personal coverage question.
2. For public or paid copy, check `references/claim-audit.md` before using counts, prices, discount percentages, “free,” “unlimited,” waiting-period, permanence or guaranteed-booking claims. If sources disagree, omit the disputed number or seek the current policy/product owner.
3. Mark the boundary in plain Spanish: **Incluido · Incluido con límite anual · De pago por uso · Servicio adicional**. State whether a limit is per policy or per insured person.
4. Explain AI as administrative coordination. A real clinician makes clinical decisions; booking depends on the service, centre, network and availability.
5. Competitor prices, conditions and rankings in the PDF are editorial comparisons. Recheck each against the competitor's current primary source before publishing.

## Provenance

Source: user-supplied `EVA_SALUD_25_ARTICULOS_REVISADOS_EXPLICACION_MEJORADA-1-.pdf`, 53 pages, dated September 2026; SHA-256 `e4a80b7e733d8a805fd685c45ed57494e94649bf26633203a96f0fd27991e107`. The complete source text is in `references/source-extract.md`, with page markers; the PDF is in `assets/original.pdf`. The audit records material differences against the app and ERP source as inspected on 2026-09-23.
