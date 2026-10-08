# Brand kit: Brainfast (the default)

## Tokens (engine/src/remotion/theme.ts)

| Token | Value | Where it comes from |
|---|---|---|
| coral | `#D95759` = oklch(0.626 0.1638 22.19) | the landing's `--secondary` and the logo stroke. (BRAND_IDENTITY.md's `#a85c3a` is wrong) |
| coral deep / light / tint | `#BF4447` / `#EE8F8B` / `#F6D5D1` | hover, accents on dark, chip backgrounds |
| cream | `#FAF9F5` | the landing's `--background` |
| sand | `#F1EFE8` | secondary surfaces |
| ink | `#171717` | the landing's `--primary` |
| type | DM Sans variable (wght 100–1000, opsz 9–40) + DM Mono | as on brainfast.ai |

Supporting colours for businesses and people in the films. The store, clinic, estate, hotel and SaaS palettes are all distinct:

| Role | Colour | Tint |
|---|---|---|
| Online store | `#5E6AD2` | `#E7E9FB` |
| Clinic | `#1C9A83` | `#DCF2EC` |
| Real estate | `#D4861C` | `#FAEBD4` |
| Hotel | `#2B86CC` | `#DCEDFA` |
| Software | `#7B55C7` | `#ECE4F8` |
| People avatar tints | `#F6D5D1`, `#DCEDFA`, `#E6E1F5`, `#FBE3C4`, `#F4E6C8` | |
| Success | `#2E9C6A` on `#EAF6EF` | |

## Logo

- **The mark** (`brand/Mark.tsx`, `lib/logo.ts`) is the exact path from `brainfast-landing/public/logo.svg`: viewBox 292 × 318, stroke 20, round caps. It's split into the strokes a pen draws in order (bolt and outer brain, then the two right lobes), so `progress` 0 → 1 draws it. `start` trims the tail (comet effects), and `head` adds a glowing pen tip. At `progress=1` it's pixel-identical to the official logo.
- **Wordmark:** "brainfast." in DM Sans 600, tracking −0.025em.
- **Lockup** (the landing's Logo component): mark height = 2/3 of the font size, gap = 1/15 em. `<Lockup>` builds it for any format.
- **On coral:** a cream mark on a coral disc (the agent avatar, `AgentDot`).
- **Tagline:** "Create a new brain, *fast.*" with "fast." in italic coral and a shine.
- **Bug:** a small mark plus wordmark top-left, from just after the drop until 10 frames before the final hit.

## CTA

**"Build your first agent for free"** (the pill) or **"Try it for free"**, then **brainfast.ai** in coral with a shine. In the voice: "Build your first agent for free, at brainfast dot A I." Never "Build your agent free". Never mention prices.

## Real product strings (use these verbatim; the source is in `~/Developer/brainfast`)

**Feedback** (`web/src/components/logs/FeedbackPopover.tsx`, `FeedbackIcons.tsx`)
- 👍 "Like this response" · 👎 "Dislike this response"
- "Please describe what was wrong with this response"
- placeholder: "e.g., The answer was incorrect because… / The agent should have used the X tool… / The response was too long…"
- toast: "Thanks for your feedback! We'll use it to improve the agent."

**Improvements** (`web/src/components/agents/workspace/AgentImprovementsContent.tsx`)
- "Review negative feedback and train your agent to avoid similar mistakes."
- button **Apply Feedbacks** · "Trainer correction"
- results: "Added the new answer" / "Replaced the previous answer" / "Discarded the new answer"
- empty state: "All caught up!", "Applied feedbacks will appear here. Your agent learns from negative feedback to avoid similar mistakes."
- conflicts: "When a correction contradicts an answer already in your FAQ, it's held here so you can decide which one wins…"

**Activity** nav: Chat Logs · Live chats · Escalations · Knowledge gaps · Leads · Campaigns. Log details: Intent · Confidence · Routing decision · Tool execution details · View conversation · "⚡ Instant reply" · "Turn into an instant reply".

**Analytics:** "Monitor your agents' performance and audience insights." Sessions · Messages · Messages over time · Sessions over time · Channels · Countries · Leads by Source · Leads by Status · Agent Breakdown.

**Escalation**
- stall message to the customer: "I've asked a teammate, they'll reply shortly." (`server/src/lib/ai/ai.service.ts`)
- staff email subject: "Customer needs your help on {agent}". Staff are notified by email, and by WhatsApp when enabled.
- reply page: "Type the answer to send to the customer…", **Rephrase your reply**: Friendlier · More formal · Shorter, "AI-suggested draft", "Use this draft". Magic links expire after 4 hours.
- knowledge gaps: "When an agent hits a question it can't answer confidently, it lands here." / "Answered questions appear here once staff reply to them."

**Takeover** (`routes/_protected/_layout/activity/conversations.$agentId.$sessionId.tsx`)
- **Take over** / **Release**, "You are responding", toast "You're now responding to this conversation", "Type a reply…", "Released. The agent will respond again."
- ⚠ "Takeover is unavailable on web widget sessions." Show takeover on a WhatsApp or Instagram chat.

**Channels:** website widget, WhatsApp, Instagram, Messenger, Slack, Discord, email, voice calls (Gemini Live). **Actions:** calendar booking, lead capture and CRM, custom tools, scheduled jobs, campaigns.

**Landing claims you can echo:** "Books the meeting, captures the lead, takes the order, and hands off to a human". "Watch every conversation, lead and booking in one dashboard." Industries on the landing: agencies, e-commerce, healthcare, real estate, restaurants, SaaS.

Grep for more: `grep -rhoE '"[A-Z][^"]{6,80}"' ~/Developer/brainfast/web/src/routes/<area> | sort -u`.

## Claims to flag in every README

- Bookings need a connected calendar. Order status needs a connected store or custom tool. Room changes need hotel tools.
- Feedback improves the agent after a person reviews it and clicks **Apply Feedbacks**; conflicting corrections can need a decision.
- People, businesses, prices and dashboard numbers are illustrative.

## Taste (from the user's own reactions)

**Loved:**
- Film #1's shine and sparkle: a spark ignites, the pen draws the mark, light runs along strokes, a kinetic tagline, "animations and shining".
- The films "magnificent… far beyond and cooler". Bold type, smooth springs, real UI, continuous motion, upbeat music.
- Michael C. Vincent's voice.
- Different angles and vibes per film. Showing many features: escalations, handoffs/takeover, feedback, activity monitoring, scaling with the business.

**Rejected or corrected:**
- A slow, flat narrator (Sarah). A narrator who sounds far from the mic (Liam).
- A cropped clock digit.
- Black text on glass. A messy dot-web over the logo. Counters stopping mid-roll.
- The same person used as "different people". Static, empty frames.
- Restaurant-only examples ("it's for any kind of business").
- Pricing talk, and the CTA "Build your agent free".

**Delivery habits the user relies on:**
- Watches remotely (the bb connect links), often on a phone.
- Wants every film in one downloadable zip.
- Likes several films at once with different angles.

## Another brand

See [brands.md](brands.md): `brand_intake.py` drafts a kit from the product's website, `brand-preview.sh` renders the approval image, `new-project.sh --brand <id>` scaffolds a rebranded project. Brainfast's own kit is `$SKILL/brands/brainfast/` (brand.json + product.md).
