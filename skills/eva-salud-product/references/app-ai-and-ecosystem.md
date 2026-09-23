# App, AI booking and adjacent services

## Connected appointment workflow

The public EVA Salud site and the connected app/backend support this sequence:

1. The user describes what they need in ordinary language. The system helps detect an appropriate specialty; it is administrative orientation, not a diagnosis.
2. The user chooses an available location and preferred dates or time blocks and submits a request.
3. EVA tracks the request through searching and contacting clinics. When the service, centre and network permit it, a voice agent can ask about availability and help arrange a booking.
4. The user can follow the request state in the app. Confirmation happens only when a centre actually accepts; failure or cancellation are possible outcomes. The backend attempts terminal notifications, but a push is best effort.
5. The app displays appointments and related details. Do not imply that every clinic supports automatic changes or that every request produces several choices.

The connected request screen is `apps-frontend/packages/features/src/medical-care/ui/screens/CreateAppointmentRequestScreen.tsx`; status is `AppointmentRequestScreen.tsx`; the booking processor and notifications are under `erp-backend/src/apps/salud/jobs/book-appointment-advance.processor.ts`. The visually polished `AIBookingScreen.tsx` imports `medical-care.mock.ts` options and timers, so **its three offered appointments and instant confirmation are demo data**, not proof of the live path. Production demos and ads should represent the connected request flow.

## AI boundaries

- The PDF says the voice AI can contact centres, check availability and assist with the reservation **when the service and centre allow it**. It does not guarantee an immediate slot, the nearest/best clinician or a successful booking.
- EVA may help route a request and explain the next administrative step. Doctors, nurses, dentists, therapists and veterinarians make clinical judgments. Do not say the AI diagnoses, prescribes, selects treatment or replaces a professional.
- “Telemedicina 24/7” is a healthcare service in the plan; do not turn it into an unsupported claim that every AI or clinic-booking action is available or completed 24/7.
- The PDF says the app should identify the beneficiary, explain limits, show conditions and track the request. Confirm a specific screen or entitlement before claiming all of these are fully automated for every user.
- For an individual, current subscription state, network, specialty, city, remaining allowance and the service's payment route determine what can actually be booked.

## Other services in the EVA Salud app

| Feature | Relationship to the medical policy |
| --- | --- |
| Other insurance comparisons and policies | Separate products with their own insurer, conditions and payment. The PDF describes five comparators and 15 insurers as an editorial figure requiring a current catalogue check. |
| Medical marketplace | Separate, paid, reduced-price services outside the NMS policy; explain cost before purchase. |
| Dental treatments beyond included cleanings | Paid separately at the applicable price. |
| Mobile and fibre | Separate contracts, tariffs, coverage and permanence. Their presence in the app does not make them health benefits. |
| Shopping/technology | A retail offer shown on the public site, separate from the medical policy. |
| Legal AI guidance | The PDF describes initial information and drafting help, not lawyer representation or a guaranteed legal result. Distinguish it from the policyholder's legal-assistance benefit. |

The current public app overview is `https://www.evasalud.app/`. Its medical booking FAQ says EVA can contact clinics and report confirmations; its other sections describe insurance, medical services, technology and mobile/fibre. It is a marketing page, so use the policy and current product data for exact coverage or price.

## Good explanatory sequence

Lead with the family insurance and its most useful included benefits. Then show the app removing administrative work: describe the need → clarify cover and limit → submit a request → follow its outcome. Introduce the marketplace and other app services only after making their separate prices and contracts clear. For ads, show actual readable app states and conditional confirmation, not a fabricated instant booking or unlimited benefit.
