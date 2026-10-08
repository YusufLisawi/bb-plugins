# Product truth: Brainfast

> [!IMPORTANT] Every claim a film makes about Brainfast must trace to a line here. Checked against the code in `~/Developer/brainfast` (server/, shared/, web/) in September 2026. Re-grep before relying on a line that may have changed.

Site: https://brainfast.ai

## What it is
A multi-tenant platform where a business builds AI agents that answer customers and staff on its channels (website widget, WhatsApp, Instagram, Slack, Discord, voice), from the business's own knowledge, and take actions through tools.

## Who it's for
Small and mid-size businesses of any niche (clinics, dentists, med spas, real estate, e-commerce, schools, restaurants, hotels) for customer-facing agents, and companies for internal agents (HR, IT, onboarding).

## Features (verified)
| Feature | What it really does | Exact UI strings | Source |
|---|---|---|---|
| Knowledge base | Upload files/links; content is vectorized or injected into the prompt | Resources, injection strategies `vectorize` / `inject` | server/src/routes/resources, CLAUDE.md |
| Custom tools | Call the business's own API, Google Calendar, Google Sheets, or an MCP server | tool types `api \| google_calendar \| google_sheets \| mcp`; Tools → Custom tools → API Configuration | shared/src/schemas (tools) |
| Built-in tools | Lead Capture, Memory, Scheduler, Fetch, Web Search, Send WhatsApp Media, Transfer To Agent, Delegate To Agent, escalate to staff | as named | server/src/lib/ai/definitions/builtin-tools.ts |
| Orchestrator | One entry point that routes each message to the right specialist agent (paid plan) | "One entry point that routes each message to the right specialist agent" | web agent types |
| Campaigns | Outbound on WhatsApp or Webhook; message templates with variables; follow-ups; working hours; rate limiting | Follow-ups → Max Follow-ups / Intervals; Working Hours; Rate Limiting (Leads per hour); Message Templates; "Email (coming soon)" | server/src/routes/campaigns, web campaigns UI |
| Human takeover | Staff take over a conversation; the AI stops replying | Take over | chat logs UI |
| Media understanding | Images are described, voice notes transcribed | — | server/src/lib/ai |
| Voice calls | Real-time voice on Gemini Live, billed per minute | — | server/src/lib/voice |
| Widget | Embeddable chat on any website (script tag) | — | CLAUDE.md |
| Scheduled jobs | Agents run tasks on a schedule | Scheduled jobs | /api/scheduled-jobs |

## Integrations and channels
WhatsApp, Instagram, Messenger (via Meta), Slack, Discord, website widget, Google Calendar, Google Sheets, webhooks, MCP. Email campaigns: **coming soon** (email only via the webhook channel).

## NOT supported (never show or imply)
- Native email campaigns (shown as "Email (coming soon)").
- An agent "deciding" medical, legal or financial questions: films show escalation to staff instead.
- WhatsApp outbound without approved templates.

## Numbers a film may use
| Number | What it measures | Source |
|---|---|---|
| Free plan; Pro $19/mo ($190/yr) | pricing | seeds/plans.json |
| Real customer numbers | only read-only aggregate prod queries, customer's OK before posting | Dispatch note "Social videos: formats, sources, and rules for real data" |

## Words and taste
- No code on screen: tools appear as the agent connected to the business's own system (`kit/systems` SystemCard).
- Generic: no city, no named languages or countries ("in their own language").
- CTA: "Build your first agent for free" or "Try it for free", then brainfast.ai.

## Sources
- `~/Developer/brainfast` codebase (CLAUDE.md, server/, shared/, web/)
- The round-3 film READMEs in `~/Developer/brainfast/marketing/*/README.md` (Content check sections)
