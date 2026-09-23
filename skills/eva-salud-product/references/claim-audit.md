# Claim audit — September 2026

This audit separates the attached **editorial briefing** from current application and ERP source inspected on 2026-09-23. It is a decision aid for writing accurate copy, not an approval of the policy terms. The signed NMS policy and current commercial offer remain decisive.

| Claim | Evidence and conflict | Use in public copy |
| --- | --- | --- |
| 34,40 €/month for up to eight insured | PDF pp. 1–2, app plan mock and ERP assistant say 34,40; Grupo EVA site says up to eight but does not show this price. | Price and availability require current offer check before publishing. “Up to eight” is consistently described, subject to policy eligibility. |
| Total included specialty/category count | PDF and app plan say **12**; ERP taxonomy and assistant say **16** categories, adding Cardiología, Neurología, Psiquiatría and Odontología; Grupo EVA's public site says **10** specialties. Category and specialty may also mean different things. | Omit the total until policy/product owner resolves definitions and updates all surfaces. The seven named core specialties are common to PDF and ERP. |
| Seven consultations without a session limit | PDF pp. 1–2 and every article name Medicina General, Pediatría, Ginecología, Oftalmología, Enfermería, Traumatología and Dermatología; ERP agrees these belong in its no-session-limit set. | Name them as included consultations, subject to active policy, network and service rules. Do not extend the claim to all procedures within each discipline. |
| Five “online” limited services | PDF labels all five online, while Fisioterapia is not established as online-only. ERP has six limited categories if Odontología is counted separately. | Say “services with annual limits”; state online only for a verified online service. |
| Fisioterapia 20 per policy year; Salud Mental/Geriatría/Urología 12 per insured year | PDF, ERP assistant and app mock broadly agree. | State the correct unit and “up to”; check current policy and remaining allowance for a person. |
| Veterinaria online yearly limit | PDF and app mock: **six**; ERP assistant: **five**. PDF says not to assume “per pet.” | Do not state the count or a per-pet allowance until resolved. |
| Three dental cleanings per policy year | PDF, app plan and ERP agree. | State “per policy,” not per person. Confirm current policy before a paid ad. |
| More than 50 reduced-price dental services | Repeated in PDF, not corroborated in the inspected app plan or ERP assistant. | Keep as an attributed editorial figure; verify the current catalogue before public use. Treatment is paid separately. |
| Annual gynaecological review | PDF states this repeatedly; not found in inspected app/ERP plan copy. | Verify exact examinations and conditions in NMS policy before an ad. |
| Discounts up to 50% or marketplace 10% below Famedic | PDF repeats “up to 50%”; article 20 calls 10% below Famedic a **commercial goal**, not an actual price guarantee. Current ERP only says reduced prices. | Do not publish percentages or “cheaper than competitor” without a dated service-level price comparison. |
| Legal AI free for entire family | PDF article 19; app/ERP say unlimited family legal assistance **for the policyholder**. A specific free AI entitlement is not established by inspected product code. | Keep legal assistance and AI guidance separate. Verify tool availability, eligibility and price. |
| AI books automatically and always sends a push | Real backend has request, calls and terminal-status notification paths; notification is best effort. Demo `AIBookingScreen.tsx` uses mocks. PDF article 21 qualifies calls by service and centre. | Say “can contact centres and help arrange a booking”; show pending/failure as possible. No instant-slot, guaranteed-success or guaranteed-push promise. |
| No permanence, no waiting period, no questionnaire, no age limit | PDF discusses how to check permanence and waiting periods but does not establish these absolute EVA terms. Some appeared in competitor reference videos. | Do not claim any of them without current policy evidence. |
| Five insurance comparators and 15 insurers | PDF article 17 calls this an editorial figure requiring current catalogue verification. | Verify the live app catalogue before use. |
| Competitor offers and rankings | Articles 1, 2, 11, 12, 17 and 25 discuss DKV, Aura and Divina using time-sensitive prices and conditions; the PDF itself asks for primary-source checking. | Recheck each named competitor's current official documents; do not recycle unverified comparisons into ads. |

## Legal and money separation

The ERP says the NMS premium is collected in-app on the insurer's behalf; marketplace purchases are separate transactions for services outside the policy. Use precise wording: **“Póliza asegurada por Nueva Mutua Sanitaria y distribuida por Comparador Eva Correduría de Seguros, S.L. bajo la marca EVA Salud.”** Avoid shortening this to “EVA is the insurer” or saying every item in the app is part of the premium.

## Evidence to request when a disputed claim matters

Ask for the current NMS policy/certificate, benefit schedule, commercial price sheet, eligible insured-person rule, live service catalogue and current app/backend behavior. For competitors, use their current official product pages and policy PDFs. Do not use the PDF's editorial date as proof of today's prices or availability.

## Inspected source leads

- PDF: `../assets/original.pdf`, complete text `source-extract.md`.
- App plan: `apps-frontend/packages/features/src/medical-care/api/medical-care-subscription.mock.ts`; Spanish labels `apps-frontend/packages/i18n/locales/eva-salud/es.json`.
- App example limits and demo options: `apps-frontend/packages/features/src/medical-care/api/medical-care.mock.ts`; `.../ui/screens/AIBookingScreen.tsx`.
- Connected booking: `.../ui/screens/CreateAppointmentRequestScreen.tsx`; ERP `erp-backend/src/apps/salud/jobs/book-appointment-advance.processor.ts`.
- ERP coverage and legal split: `erp-backend/src/apps/salud/lib/eva-system-prompt.ts`; category taxonomy `.../eva-service-taxonomy.ts`.
- Public EVA overview: `https://www.evasalud.app/`; Grupo overview: `https://evagrupo.com/` (its “10 especialidades” count differs).
