# Mano vs. Jobber — Feature Comparison

*2026-10-20 · planning document · Jobber details from its official pricing page (getjobber.com/pricing, read 2026-10-20);
feature specifics beyond that page are marked "verify".*

We are not copying Jobber's screens. Jobber is the reference for **what field-service businesses end up needing**; Mano's
job is to deliver the parts that matter to a 1–10 person Atlanta contractor, in Spanish first, with less to learn.

## Jobber at a glance (from its pricing page)

| Plan | Users | Price (monthly, no commitment → annual) | Adds |
|---|---|---|---|
| Core | 1 | $49 → $29/mo yearly | Quotes, invoices, online payments, online booking & scheduling, website, reporting, 100+ integrations |
| Connect | 1–15 | $139–$399 → $99–$299/mo yearly | Automated client reminders, automatic payment collection, checklists, quote & invoice follow-ups, QuickBooks sync, time & expense tracking |
| Grow | 1–15 | $199–$499 → $149–$399/mo yearly | Visual quotes with reviews, optional upsell line items, automatic time tracking, job costing, two-way SMS, custom automations |
| Plus | 5–15 | $499–$699 → $399–$529/mo yearly | Unlimited photos/videos, crew scheduling, expense capture, profitability alerts, custom reports, Pipeline, AI Receptionist, premium support |

Extra users $29/mo. Add-ons: Marketing Suite $99, AI Receptionist $29, Pipeline $49. Card processing 2.9% + 30¢, ACH 1%,
instant payout +1%. **Takeaway:** Jobber's entry price is ~$29–49 for *one user*, and the features small crews really want
(reminders, follow-ups, SMS) start at $99–139. That's the gap Mano can fill for Atlanta's small contractors.

## How to read the matrix

- **Mano now:** ✅ working · 🟡 partial · 🎭 screens only/fake · ❌ missing (details in the [audit](MANO_PRODUCT_AUDIT.md))
- **Complexity:** S (days) · M (1–2 weeks) · L (weeks, new infrastructure)
- **Atlanta priority:** **P1** needed to run a business on Mano · **P2** daily-use value · **P3** growth · **Later** platform
- Every P1 item also depends on the **foundation** (server is the source of truth, auth, organizations) — "F" below.

## CRM

| Feature | Problem it solves | Jobber | Mano now | How Mano should do it | Cx | Depends on | Priority |
|---|---|---|---|---|---|---|---|
| Customer profiles | One place for a client's info and history | Client record with properties | ✅ device only | Keep the client page; move to `customers` table | M | F | **P1** |
| Contact info | Call/text/email in one tap | Yes | ✅ | Same, server-backed; WhatsApp first | S | F | **P1** |
| Multiple properties per customer | Companies (ATL Homemaker) send you to many houses | Properties per client | 🟡 per-line sites | `properties` table; pick a property per job; keep per-line sites for multi-house invoices | M | F | **P1** |
| Customer notes | Gate codes, preferences | Notes on client/job | ✅ Solo, device only | Same, server-backed; Solo | S | F | P2 |
| Communication history | "Did I send it? Did they open it?" | Email/SMS log (Connect+) | ❌ | Activity log: sent, opened link, approved, paid, reminders — no inbox needed | M | F, link hosting | P2 |
| Job & payment history | What they've paid, what's late | Yes | ✅ client page | Same, server-backed | S | F | **P1** |
| Lead tracking & follow-ups | Don't lose price requests | Requests + Pipeline add-on ($49) | ❌ | "Solicitud" = a job before an estimate (status already exists); won/lost; source | M | F | P3 (Solo) |

## Estimates

| Feature | Problem | Jobber | Mano now | How Mano should do it | Cx | Depends on | Priority |
|---|---|---|---|---|---|---|---|
| Professional estimates | Look legit to English-speaking clients | Yes | ✅ | Keep | — | — | ✅ |
| AI-assisted / voice-to-estimate | Owner can't or won't type in English | AI Receptionist/Copilot (verify scope) | ✅ voice, photo of note, text | **Mano's core advantage.** Keep; meter AI by plan | — | — | ✅ |
| Line items, custom pricing, qty × unit | Price the way trades price | Yes | ✅ | Add a saved price list later (Wave's "Products & services") | S | F | P2 |
| Optional services / packages | Upsell; "good/better/best" | Optional line items (Grow) | ❌ | Optional lines the client ticks on the link; total updates | M | F, hosted link | P2 |
| Customer approval | Know when it's a yes | Client hub approval | 🟡 local/Wi-Fi | Hosted link, approval recorded server-side | M | F, hosting | **P1** |
| E-signature | Proof of agreement | Signature on approval (verify) | 🟡 typed name | Typed name + timestamp + IP; drawn signature later | S | hosted link | **P1** (typed) |
| Estimate → job | Approved work becomes scheduled work | Yes | ✅ same record | Keep one flow; separate `estimates` table so revisions work | M | F | **P1** |
| Deposits | Get cash before buying materials | Deposits on quotes (verify plan) | ❌ | Deposit % or $ on the estimate → deposit invoice paid online | M | online payments | P2 |
| Revise a sent estimate | Clients change their minds | Yes | ❌ | New version (v2) on the same link; old version kept | M | `estimates` table | P2 |

## Job management

| Feature | Problem | Jobber | Mano now | How Mano should do it | Cx | Depends on | Priority |
|---|---|---|---|---|---|---|---|
| Job creation & status | Know where every job is | Yes | ✅ | Keep | — | — | ✅ |
| Scheduling & calendar | "What am I doing Saturday?" | Calendar, drag & drop | 🟡 date only | Day + time, simple week view; phone-first agenda | M | F | **P1** (basic) |
| Team assignments | Who goes where | Yes (crew scheduling Plus) | ❌ | Assign a job to a member; their phone shows their day | M | users/roles | P2 (Equipo) |
| Job notes & photos | Proof of work, site details | Photos (unlimited on Plus) | 🎭 IndexedDB | S3-style storage; keep captions/translation/private | M | F, storage | **P1** |
| Checklists | Don't forget steps | Connect+ | 🟡 Ojo trade checklists (pricing) | Later: per-trade job checklists | S | — | P3 |
| Recurring jobs | Cleaning, lawn care | Yes | ❌ | Repeat rule on a job → future visits | M | calendar | P2 (Solo) |
| Time tracking | Pay crews, price better | Connect+ | ❌ | Clock in/out per job | M | users | P3 (Equipo) |
| Job costing | Did I make money? | Grow+ | ❌ | Materials + labor vs. price; "Ganaste $1,100" | M | expenses, time | P3 |

## Invoicing & payments

| Feature | Problem | Jobber | Mano now | How Mano should do it | Cx | Depends on | Priority |
|---|---|---|---|---|---|---|---|
| Estimate → invoice | Bill without retyping | Yes | ✅ | Keep; separate `invoices` table (deposit + final) | M | F | **P1** |
| Online payments | Get paid faster | Card 2.9%+30¢, ACH 1% | ❌ | Stripe Connect: card + ACH on the client link; Zelle/check still recorded by hand | L | F, hosting, Stripe | **P1** |
| Deposits & partial payments | Common in remodeling | Yes | 🟡 partial payments recorded by hand | Partial online payments; deposit invoices | M | online payments | P2 |
| Payment status | Who owes me | Yes | ✅ device only | Server-backed; online payments mark paid automatically (fixes "nobody marks it paid") | S | online payments | **P1** |
| Automatic reminders | Chasing money is awkward | Connect+ | 🟡 written by Mano, sent by owner | Email reminders automatic (cheap); SMS on paid plans | M | F, email/SMS provider, worker | P2 |
| Recurring invoices | Monthly service | Yes | ❌ | With recurring jobs | M | recurring jobs | P2 (Solo) |
| Receipts | Proof for the client | Yes | ❌ | Auto receipt (email + on the link) when a payment is recorded | S | F | **P1** |
| Refunds | Mistakes, cancellations | Through payments | ❌ | Through Stripe; record manual refunds | S | online payments | P2 |
| Sales tax | Some trades/materials | Yes | ❌ | Optional rate per business/line (confirm GA rules) | S | — | P2 |

## Customer experience

| Feature | Problem | Jobber | Mano now | How Mano should do it | Cx | Depends on | Priority |
|---|---|---|---|---|---|---|---|
| Customer portal | Clients find everything | Client Hub | 🟡 one link per job | Same link shows all of that client's open documents | M | hosting | P2 |
| Online booking | Get new work while busy | Core | ❌ | Simple request form → "Solicitud" in Mano | M | leads | P3 (Solo) |
| Appointment confirmations / notifications | Fewer no-shows | Connect+ | ❌ | Automatic "see you Saturday" (email free, SMS paid) | M | scheduling, messaging | P2 |
| Client-facing bilingual documents | Spanish- or English-speaking clients | English (verify other languages) | ✅ EN/ES link + PDF | **Advantage.** Keep | — | — | ✅ |
| Text & email | Reach clients where they are | Two-way SMS (Grow) | 🟡 owner's WhatsApp/SMS | Keep owner-sent WhatsApp (free, trusted); add email sending; 2-way SMS later | M | provider | P2 |

## Business operations

| Feature | Problem | Jobber | Mano now | How Mano should do it | Cx | Depends on | Priority |
|---|---|---|---|---|---|---|---|
| Dashboard & reporting | How's business? | Reporting (Core), custom (Plus) | ✅ dashboard | Monthly revenue, owed, top clients; accountant export | M | F | P3 |
| Team permissions | Helpers shouldn't see money | Yes | ❌ | Owner / office / crew roles | M | users | P2 (Equipo) |
| Revenue tracking | Taxes, planning | Yes | 🟡 paid this month | Monthly/annual totals | S | F | P3 |
| Expenses | Materials, gas | Connect+ | ❌ | Receipt photo → expense on a job | M | storage, AI | P3 |
| Automation workflows | Less busywork | Grow+ | 🟡 Ojo suggests | Ojo rules that act with approval (reminders, follow-ups) | M | messaging, worker | P2–P3 |
| Integrations | Accountant, calendar | 100+ | ❌ | QuickBooks export first; Google Calendar later | M–L | F | Later |
| Subscription plans & limits | Revenue | Yes | 🎭 | Stripe Billing + entitlements table | M | F | **P1** (before charging) |

## Where Mano can win

1. **Spanish-first, English-out** at the core, not a translated menu.
2. **Voice and photo-of-a-paper-note** capture, which Jobber's audience doesn't need but ours does.
3. **Price:** the reminders/follow-ups/payments small crews want, at $19–49 instead of $99–199.
4. **One next step (Ojo)** instead of a dashboard full of charts.
5. **WhatsApp-native sending** from the owner's own number (trust, zero messaging cost).

## Deliberately not now

Website builder, marketing suite, AI phone receptionist, GPS tracking, 100+ integrations, inventory, point of sale
(see `docs/brand-and-vision.md`: contractors first, no POS). Revisit after the first paying Atlanta customers.

## Sources
- [Jobber pricing (official)](https://www.getjobber.com/pricing/)
- Third-party summaries used only to cross-check, not as fact: [OneCrew](https://www.getonecrew.com/post/jobber-pricing), [FieldProxy](https://www.fieldproxy.ai/fsm-software-pricing/jobber), [CostBench](https://costbench.com/software/field-service-management/jobber/)
