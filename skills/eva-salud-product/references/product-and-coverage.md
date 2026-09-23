# Product, coverage and payment model

This page distils the attached September 2026 editorial PDF. Read `claim-audit.md` before quoting any exact figure in public copy. A signed policy and the insured person's current usage record determine actual entitlement.

## Identity and contracting

- Product: EVA Salud Familiar, a family medical insurance policy. The ERP describes **Nueva Mutua Sanitaria (NMS)** as issuer and underwriter, and **Comparador Eva Correduría de Seguros, S.L.** as distributor under the EVA Salud brand. The PDF calls NMS the former Mutua de la Abogacía.
- Editorial price: **34,40 € per month for a family with up to eight insured people**. It is a reference, not a live quote. The app's plan card and ERP assistant contain the same figure; recheck before publication.
- Contracting: the ERP describes digital signature and payment of the first premium in the app. A downloaded app or pending policy is not itself proof of active cover. The ERP blocks booking when the subscription is unusable.
- The product is positioned as a practical family plan for everyday medical needs. It is not automatically a full hospitalisation or major-procedure policy; only explicitly listed cover can be described as insured.

## What the PDF says is included without a session limit

The editorial architecture names these **seven** consultations: Medicina General, Pediatría, Ginecología, Oftalmología, Enfermería, Traumatología and Dermatología. “Without a session limit” refers to the consultations in the applicable policy and network. It does not make all related procedures, diagnostics or treatments free. The PDF additionally mentions one annual gynaecology review, but that detail needs policy confirmation before becoming an ad claim.

## Included with an annual limit

| Service | PDF's stated allowance | Scope | Source check |
| --- | --- | --- | --- |
| Fisioterapia | Up to 20 sessions | Per policy year | ERP and app mock also say 20 per policy. |
| Salud Mental | Up to 12 sessions | Per insured person per year | ERP and app mock agree. |
| Geriatría online | Up to 12 consultations | Per insured person per year | ERP and app mock agree. |
| Urología online | Up to 12 consultations | Per insured person per year | ERP and app mock agree. |
| Veterinaria online | Up to **six** consultations | Per year; PDF explicitly avoids saying “per pet” | ERP assistant says **five**; app mock says six. Do not quote a number until policy/product owner resolves it. |

The PDF calls all five “online,” but its own Fisioterapia discussion does not establish an online-only modality. Describe them as **limited services**; name a modality only when confirmed for that service.

## Other health benefits

- **Telemedicina 24/7:** listed by the PDF, app plan and ERP. The medical professional provides the clinical consultation. Telemedicine is not an emergency service or a substitute for examination when needed.
- **Dental:** three cleanings per policy year are stated in the PDF, app and ERP. Other dental treatments are paid separately. The PDF says access to more than 50 reduced-price dental services; the count has not been corroborated in current product code.
- **Legal assistance:** the app and ERP say unlimited family legal assistance **for the policyholder**. The PDF describes a free legal AI tool for the whole family. Keep these concepts separate and verify current eligibility, whether the tool is live and whether it carries a separate price before advertising it.
- **Family management:** the app is intended to centralise insured people, coverage, policy information, requests and appointments. Do not assume that one family member can automatically see another's private data without the relevant permissions.

## The marketplace is a separate purchase

Additional diagnostics, procedures, treatments, home services, emergency/transport services and specialties outside policy cover may be available through the marketplace. They are **not included in the NMS premium**. The ERP describes a separate pay-per-use transaction, paid by card before the service; show the actual price and terms before purchase. The PDF describes reduced or negotiated prices, but its “up to 50%” and “10% cheaper than Famedic” statements are unverified or targets, not blanket promises.

Distinguish the payment concepts precisely:

| Term | Meaning |
| --- | --- |
| Included | Within the policy, subject to its conditions and active cover. |
| Included with annual limit | Within the policy until that person's or policy's allowance is used. |
| Copay | A charge attached to use of a covered service, only if the actual policy states one. |
| Balance | A spendable allowance; the PDF says not to reduce EVA Salud to a simple balance model. |
| Pay per use | A separate marketplace service and charge, outside the insured premium. |

Do not silently convert an exhausted allowance into “still included.” Check the current remaining allowance and explain the next available route.

## Scope questions for a prospective customer

The PDF's ten-question checklist is useful: number of insured people; which consultations have no session limit; limits per policy versus per person; dental included; telemedicine; who arranges appointments; price of non-covered care; marketplace terms; permanence and renewal; and which extra ecosystem services have separate contracts. Also check network availability, exclusions, waiting periods and the current insurer documents. The PDF's article about “sin permanencia” is a comparison topic, not proof that EVA has no permanence.

## Source locations in the EVA checkout

- ERP contract and coverage language: `erp-backend/src/apps/salud/lib/eva-system-prompt.ts`.
- ERP category taxonomy: `erp-backend/src/apps/salud/lib/eva-service-taxonomy.ts`.
- App plan card: `apps-frontend/packages/features/src/medical-care/api/medical-care-subscription.mock.ts` and `apps-frontend/packages/i18n/locales/eva-salud/es.json`.
- App sample specialty limits: `apps-frontend/packages/features/src/medical-care/api/medical-care.mock.ts`.

The checkout paths are verification leads, not portable policy documents. Source-extract page numbers: overview pp. 1–3; core coverage pp. 4–7; physiotherapy pp. 12–13; payment distinctions pp. 16–17; online limits pp. 30–33; dental pp. 34–35; marketplace pp. 42–43; family pp. 46–47; checklist pp. 50–51.
