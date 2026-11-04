# Mano — Pricing Strategy (proposal)

*2026-10-20 · for review; nothing changes in the app until Abe approves. Competitor numbers come from their pages or
cross-checked summaries (sources at the end); our cost numbers are estimates to verify before launch.*

## Principle

**We monetize productivity, automation and team collaboration — not basic business activity.**
Free never limits manually created estimates, invoices, clients or payment records. Limits exist only where Mano pays
real money per use (AI, voice, SMS, storage, integrations) or where a feature saves the owner real time (automation)
or serves a team.

**Nobody loses access to their history.** Downgrading never deletes or hides past estimates, invoices, payments,
notes or files; paid features become read-only, not invisible.

## What competitors give away vs. charge for

| | Free tier | First paid tier | What's paid |
|---|---|---|---|
| **Wave** | Starter, $0: unlimited invoices & estimates | Pro, ~$19/mo | Recurring invoices, automatic payment reminders, deposit requests, multiple users, bank feeds, receipt scanning |
| **Square Invoices** | Free: unlimited invoices, **recurring, deposits, automatic reminders, reports** | Plus, ~$20/mo (US) | Multi-package estimates, auto-convert accepted estimates to invoices, more customization |
| **Zoho Invoice** | Free, with a yearly usage cap on invoices (exact number unclear, reported ~500/yr) and Zoho branding | — | Mostly integrations into paid Zoho Books |
| **Jobber** | No free plan | Core $29–49/mo, 1 user | Reminders & follow-ups (Connect $99–139+), job costing & 2-way SMS (Grow $149–199+), extra users $29 |

**Read:** unlimited invoices and estimates are table stakes (Wave, Square). Square even gives reminders, recurring and
deposits away, because it earns on payment processing. Wave charges $19 for exactly the automation layer. Jobber charges
$99+ for the automation small crews want most. Mano's sweet spot: **Wave-level free, Wave/Jobber-Core price for
automation, a third of Jobber's price for teams.**

## Mano's variable costs (estimates, verify before launch)

| Resource | Unit cost | Typical use / business / month | Est. cost |
|---|---|---|---|
| Voice transcription (ElevenLabs Scribe v2) | ~$0.22–0.27 per audio hour | 40 voice notes × 1 min | ~$0.15–0.20 |
| AI drafting / reading a note / translation (Gemini Flash-Lite) | fractions of a cent per call | 60 calls | < $0.10 |
| File storage (S3-type, shrunk photos ~300 KB) | ~$0.02 per GB-month + transfer | 500 photos ≈ 150 MB | < $0.05 |
| Email (transactional) | ~$0.001 per email or free tiers | 100 | ~$0.10 |
| SMS (Twilio-type, US) | ~$0.011–0.013 per message all-in + 10DLC registration fees | 100 reminders | ~$1.20 + registration |
| WhatsApp sent from the owner's own phone | $0 to Mano | — | $0 |
| Hosting, DB, monitoring | fixed, shared | — | pennies per business at scale |
| Support (Spanish, by phone/WhatsApp) | people time | — | the real cost; keep the product simple |

**Takeaway:** AI and voice are cheap per business (well under $1/month at normal use), so they can be generous on paid
plans and *tasted* on Free. **SMS is the one cost that grows with use** and needs allowances. Support is the biggest
real cost, which argues for simplicity over feature count.

## Proposed plans

| | **Gratis — $0** | **Solo — $19/mo** | **Equipo — $49/mo** |
|---|---|---|---|
| Who | Trying Mano / a few jobs a month | One contractor running their business | Owner + helpers / office |
| Users | 1 | 1 | 3 included, +$9 per extra user |
| Estimates, invoices, clients, jobs (created by hand) | **Unlimited** | Unlimited | Unlimited |
| Client link, approval, PDF (EN/ES) | ✅ | ✅ | ✅ |
| Record payments (Zelle, cash, check…), partial payments, overdue tracking | ✅ | ✅ | ✅ |
| Online payments (card/ACH) | ✅ (processing fees apply) | ✅ | ✅ |
| Ojo's next step + reminders written for you (you send them from WhatsApp) | ✅ | ✅ | ✅ |
| AI drafts (voice, photo of a note, Mano organizes) | **25 / month** (typing by hand stays unlimited) | Fair use (soft cap ~300) | Fair use per user |
| Photos & files | 3 photos per job, 500 MB total | Unlimited photos + PDFs, 10 GB | 50 GB shared |
| "Sent with Mano" on documents | Shown | Removable | Removable |
| **Automatic** reminders & follow-ups | — | Email unlimited · 100 SMS/mo included | Email unlimited · 300 SMS/mo shared |
| Deposits, optional line items, estimate revisions | Deposits ✅ (drives payments) · others — | ✅ | ✅ |
| Recurring jobs & invoices | — | ✅ | ✅ |
| CRM: client notes, history, leads won/lost, source, repeat-work reminders | Client page + history ✅ · notes/leads — | ✅ | ✅ |
| Booking / request form | — | ✅ | ✅ |
| Saved price list, your logo (later) | — | ✅ | ✅ |
| Team roles, permissions, assignments, shared schedule | — | — | ✅ |
| Time tracking, job costing, reports, accountant export | Basic dashboard | Reports | ✅ all |
| Extra SMS | — | $X per 100 (at cost + margin) | same |

### Why each boundary

- **Deposits on Free:** Square gives them away, and every deposit paid online is processing revenue.
- **Automatic reminders on Solo (not Free):** that's the automation the principle says to charge for. Free still has
  one-tap reminders the owner sends from WhatsApp, so nobody is stuck chasing money by hand. This is a risk against
  Square (free automatic reminders); revisit if it slows signups.
- **AI 25/month on Free:** enough to feel the magic (most free users make a handful of estimates), cheap for us, and
  never a wall because typing or filling in by hand is unlimited.
- **SMS allowances:** the only per-message cost; email is unlimited everywhere.
- **Equipo at $49 with 3 users:** Jobber charges $29 *per extra user*; three small-crew seats at $49 is a clear win and
  covers the shared SMS/storage.

## Two revenue streams (keep them separate)

1. **Subscriptions** (Solo, Equipo): predictable, priced on automation, productivity and teams.
2. **Payment processing** (all plans, including Free): clients pay invoices online through Stripe Connect.
   Proposed: card at about the market rate (≈ 2.9% + 30¢, like Jobber) with a small Mano platform fee inside it
   (e.g., 0.5%), ACH ≈ 1% capped. Owners can always avoid fees with Zelle/cash/check recorded by hand.
   *Verify:* Stripe Connect pricing, application-fee rules, and how the fee is shown to the client.

## Upgrade paths (moments, not paywalls)

- AI draft #26 in a month → "Te quedan 0 este mes · Escribe o llénalo tú, o pásate a Solo" (blue upgrade card).
- 4th photo on a job / first PDF → photos upgrade card (already built).
- Turning on automatic reminders → Solo.
- First client note → Solo (already built).
- Inviting a helper → Equipo.
- Showing "Enviado con Mano" in the PDF preview → Solo (already built).

## What the current code needs to match this (after approval)

`lib/plan.ts` and the Planes page already have Free / Solo $19 / Crew $49 with photos, PDFs, branding and notes gates.
To match: rename Crew → **Equipo** in Spanish copy (it already shows "Equipo"), add the AI-draft allowance and counter,
show "unlimited estimates and invoices" on Free, add users/automatic reminders/recurring to the feature lists, and move
enforcement to the server in Phase 1 (item 1.6–1.7 in the roadmap).

## Open questions

1. Annual pricing (e.g., 2 months free) at launch, or later?
2. A launch offer for the first Atlanta businesses (e.g., Solo free for 3 months)?
3. Platform fee on payments: yes/no and how much?
4. Should automatic **email** reminders be free (to match Square) while SMS stays paid?

## Sources
- [Jobber pricing (official)](https://www.getjobber.com/pricing/)
- Wave: [CostBench](https://costbench.com/software/invoicing/wave/free-plan/), [Capterra](https://www.capterra.com/p/178021/Wave-Apps/pricing/), [beancount.io on the June 2026 restructure](https://beancount.io/blog/2026/08/05/wave-accounting-bank-feeds-collaborator-paywall-guide)
- Square: [Compare Invoices Free and Plus (official help)](https://squareup.com/help/article/7650), [Square Invoices Plus](https://squareup.com/us/es/invoices/whats-new)
- Zoho: [Zoho help on free-plan usage limits](https://zstatic.zohostatic.com/uk/invoice/kb/general/invoices-creation-free.md), [Rework](https://resources.rework.com/tools/erp-finance/best-zoho-invoice-alternatives), [Tech.co](https://tech.co/accounting-software/zoho-invoice-review)
- Costs: [ElevenLabs pricing summary (Puter)](https://developer.puter.com/tutorials/elevenlabs-api-pricing/), [Soniox STT comparison](https://soniox.com/compare/stt/pricing), [Twilio SMS pricing](https://www.twilio.com/en-us/sms/pricing), [automationatlas.io](https://automationatlas.io/answers/twilio-pricing-explained-2026/), [textbee.dev](https://textbee.dev/blog/twilio-pricing-real-cost-breakdown)
