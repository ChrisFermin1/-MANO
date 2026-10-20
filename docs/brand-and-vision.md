# MANO™ — The Master Vision

Brand identity, product strategy, marketing, and long-term vision.

- **Origin:** Atlanta, Georgia
- **Founders:** four Latino software engineering students
- **Status:** functional hackathon project with ambitions to become a real startup

> How to use this document: it is **context and vision**, not a to-do list. Distinguish what exists (section 5)
> from ideas. Contractors come first; nothing in sections 11–16 gets built before the contractor product works
> for real businesses. For what's built and what's next, see `docs/mvp-build-plan.md` and the
> "Mano: Vision & Roadmap" doc.
>
> Trademark: use **™**, not ®, until "Mano" is registered with the USPTO (® on an unregistered mark is not
> allowed in the US). Check that the name is available for software before printing merch.

---

## 1. The origin story

Mano began as a hackathon project created by four Latino software engineering students in Georgia.

The original idea was simple: help Spanish-speaking contractors turn spoken Spanish into professional English
estimates and invoices.

The inspiration came from a real problem. One of the founders grew up around his family's painting and
remodeling business, Nabe Painting & Remodeling, operated by his father, Edgar.

Like many Hispanic entrepreneurs in the United States, Edgar knows his trade. He understands construction,
painting, remodeling, customers, and the work required to operate a business. But being skilled at a trade and
managing the administrative side of a business are two different challenges. Language barriers, paperwork,
estimates, invoices, communication, and technology can make business ownership more complicated.

Mano was created to help bridge that gap.

What started as a contractor-focused tool has inspired a much larger vision: **build a Hispanic-founded
technology company that helps Hispanic-owned businesses succeed.** The founders want Mano to become a
successful company while empowering the communities and entrepreneurs it was created to serve. These are
complementary goals, not competing ones.

## 2. What does Mano mean?

**MANO — hand.** In Spanish, *mano* means hand. It represents the people who build, cook, repair, clean,
create, and operate their businesses with their hands: the contractor painting a house, the cook preparing
tacos, the barber cutting hair, the mechanic repairing a vehicle, the entrepreneur creating something from
nothing. Their hands are the foundation of their businesses.

**MANO — hermano.** *Mano* is also a short, informal form of *hermano*, brother. It represents community,
friendship, support, trust, and growing together. Building a business can be difficult and lonely. Mano should
feel like a helping hand and a reliable partner.

**The cultural connection: "Échame la mano."** A familiar expression meaning "give me a hand" or "help me
out." This could become one of Mano's most recognizable brand concepts. Mano is the helping hand behind the
business.

**Brand philosophy:** *A hand to build. A brother to grow with.* We believe building a business shouldn't
mean doing everything alone.

## 3. Mission, vision, and purpose

- **Proposed mission:** make running a business simpler and more accessible for Spanish-speaking
  entrepreneurs through intuitive, bilingual, voice-first technology.
- **Proposed vision:** become the business platform that Hispanic entrepreneurs trust to start, manage, and
  grow their businesses.
- **Long-term ambition:** create a technology company founded by Latinos that becomes a major competitor in
  the business software industry while helping Hispanic entrepreneurs succeed.
- **Core belief:** when our businesses grow, we all move forward. Mano's success should be connected to the
  success of the businesses using it: a cleaning business hiring its first employee, a taco truck becoming a
  restaurant, a painter growing from working alone to managing a crew, a family business becoming something
  the next generation can inherit. Mano would not create these successes by itself. The entrepreneurs do the
  work. Mano should make the administrative side easier.

## 4. Brand messaging

Proposed brand lines to explore (not all simultaneous slogans):

- Échame la mano.
- Para que nunca emprendas solo.
- Built by hand. Powered by voice.
- Made for the ones who build. / Built for the ones who build.
- Tú hablas. Mano escribe.
- Less paperwork. More work.
- Your business. Your language.
- Built locally. Made for everyone.
- When our businesses grow, we all move forward.

Broader entrepreneurship campaign: *Para los que construyen. Para los que venden. Para los que emprenden.*

**Brand personality.** Mano should feel human, not robotic; confident, not arrogant; professional, not
corporate; culturally authentic, not stereotypical; modern but approachable; premium but accessible; helpful
without being patronizing.

Mano should celebrate entrepreneurs rather than portray them as helpless. The message is not that Hispanic
entrepreneurs need technology to be successful. The message is that they deserve excellent tools designed
around how they work.

## 5. Current product — what already exists (as of Oct 20, 2026)

A working app for contractors (web app; works from Safari and as a Home Screen app). Built on the team's
`dev` branch plus Abe's branch `abe/experiments` (not merged into `dev` yet).

**Already works**

- **Talk, scan, or type a job** in Spanish or English. Voice keeps only the main speaker (no TV) in the right
  language; a photo of a handwritten note or a screenshot can be read. Mano organizes it into a job with line
  items, prices, client and address.
- **Professional English estimates and invoices** from Spanish, previewable in Spanish. Required choice:
  estimate (work not done yet) or invoice (work done).
- **Ojo** checks the job while Carlos writes: missing information and "forgot to charge for…?" questions based
  on the job's type.
- **Client link**: the client opens the estimate or invoice without an app, approves with their name, sees
  the balance and how to pay, and can download a PDF.
- **Sending**: WhatsApp, text, copy link, QR, or the PDF through the phone's share sheet. A job counts as
  "sent" only once it's shared.
- **Payments**: mark paid by Zelle, bank, check, cash or card; partial payments with a progress bar; undo a
  payment; overdue tracking; follow-up and payment reminders written by Mano.
- **Invoice due dates**: default terms (on receipt / 7 / 15 / 30 days) and a date per invoice.
- **Company clients**: one invoice for several houses (lines grouped by address); Mano recognizes saved
  clients in a note and fills in their details.
- **Home screen**: one next step at a time, money owed / overdue / paid this month.
- **Lists**: jobs (with search), estimates and invoices, clients (saved clients, "new job for…").
- **Onboarding**: trade, first and last name, business, phone, email, address, how clients pay.

**Not built yet (so not "existing")**: accounts and login, hosting (client links only work on the
developer's Wi-Fi today), the database as the main record (data lives in the phone's browser), emailing from
Mano, deposits, change orders, revising a sent estimate, sales tax, notifications when the app is closed,
App Store / Google Play apps, online card payments.

The current UI is liked by the founders. It should not be redesigned unnecessarily.

## 6. Mano visual identity

The direction is minimal, editorial, premium, and construction-inspired.

**Primary palette**

| Color | Hex | Purpose |
|---|---|---|
| Forest Green | `#073D2D` | Brand, primary actions |
| Warm Ivory | `#F5F5ED` | Main backgrounds |
| Pure White | `#FFFFFF` | Cards and surfaces |
| Charcoal | `#202522` | Primary text |
| Muted Sage | `#DDE7D8` | Positive states |

**Status colors**

| Status | Background | Text |
|---|---|---|
| Approved / Paid | `#DDE7D8` | `#073D2D` |
| Pending | `#F2E8D6` | `#815C2C` |
| Overdue | `#F2DFD9` | `#9B493B` |
| Draft / Invoiced | `#ECEDE8` | `#555D57` |

(These are the tokens in `frontend/src/app/globals.css`.)

**Visual rules:** no lime green, no neon accents, no unnecessary gradients, no *more* glassmorphism than the
app already has, no generic AI dashboard aesthetics. Warm ivory backgrounds, white cards, forest green primary
buttons, charcoal text, restrained accents.

**Typography:** elegant serif for important headlines and greetings; clean sans-serif for interface, forms,
buttons and money; occasional monospace labels.

**Preserve the existing UI** when updating the app: layout, spacing, typography, border radii, card
dimensions, navigation, icons, animations, functionality.

**Dashboard treatment:** *Your next action* — forest green, white text, white button with forest green text.
*Approved estimate* — muted sage with forest green text ("Ronaldo approved your estimate — $15,000").
*Money cards* — white, charcoal figures, restrained status colors. *Recent jobs* — white cards, subtle
separators, consistent status colors.

## 7. Editorial marketing direction

Mano's marketing should feel like a mix of construction culture, workwear photography, editorial fashion,
architectural design, documentary storytelling, and modern technology.

The founders like the creative philosophy associated with Virgil Abloh and Off-White. The intention is to
draw on editorial composition, cultural storytelling, industrial details and fashion-like campaign
presentation — **not** to copy recognizable trademarks, logos, or graphics.

Visual elements: real contractors, paint-stained clothing, work boots, tools, concrete, unfinished interiors,
scaffolding, blueprints, measurement marks, architectural grid lines, industrial typography, natural light,
muted photography, minimal brand graphics.

Mano should look like a cultural brand that happens to build powerful business software, not another generic
AI startup. Photography should feature authentic people and real work wherever possible.

## 8. Marketing campaigns

**Campaign 001 — Built by hand.** The people behind the work. Editorial portraits of contractors; close-ups
of hands, tools, workwear and jobsites; documentary-style video; minimal text; warm neutral colors. Messaging:
"Estas manos construyen." "Built by hand. Powered by voice." "The work is human." Possible first subject:
Edgar, owner of Nabe Painting & Remodeling — walking through a house, describing the work in Spanish, then
Mano turning it into a professional English estimate. Emotional connection before selling software.

**Campaign 002 — No translation needed.** What Mano actually does: a contractor describes a job in Spanish,
Mano creates an estimate, the contractor reviews it, the customer receives it. "Tú hablas. Mano escribe."
"Your business. Your language." Simplicity and practical usefulness.

**Campaign 003 — Built different.** Construction culture and brand identity: branded workwear, trucker hats,
utility shirts, jobsite photography, industrial typography, stickers, architectural compositions. "For the ones
who build." "Not another office tool." (After the trademark check.)

**Campaign 004 — Échame la mano.** Community and entrepreneurship, once Mano serves more than contractors:
a taco truck owner, a barber, a mechanic, a painter, a restaurant owner, a cleaning business owner — different
challenges, the shared experience of building something of their own. Main message "Échame la mano."
Supporting "Para que nunca emprendas solo." Could become Mano's signature campaign.

## 9. Atlanta-first launch strategy

Start with Hispanic contractors in metro Atlanta — Marietta, Kennesaw, Acworth, greater Atlanta. Starting
points, not limits.

Why Atlanta: the founders are in Georgia, have access to local contractor networks, Nabe can be the first
case study, and the team can meet users in person.

Proposed first 30 days (not commitments):

- **Week 1:** interview 10 contractors about estimates, invoices, customer communication, and getting paid.
- **Week 2:** three short Spanish-language product demos.
- **Week 3:** recruit five beta testers who use Mano on real jobs.
- **Week 4:** evaluate usage, estimate quality, time saved, repeat use, and willingness to pay.

## 10. Facebook vs. Instagram

Facebook reaches established Hispanic small-business owners through community groups, referrals and
Spanish-language content. Instagram builds the brand and shows Mano's visual identity.

Starting split (a hypothesis): **60%** Facebook outreach and communities, **25%** Instagram branding and
Reels, **15%** direct outreach and interviews.

- **Facebook:** practical demos, Spanish explanations, testimonials with permission, real examples,
  invitations to try Mano, participating in groups without spamming.
- **Instagram:** editorial photography, founder storytelling, contractor documentaries, product demos, brand
  campaigns, workwear and construction culture.

Instagram builds recognition; Facebook tests customer acquisition. Measure both by signups and active users,
not engagement.

## 11. Joe — the property owner use case

Joe owns several properties and hires Edgar and other workers to maintain them. He mostly calls and texts.

- **Contractor side:** Edgar creates estimates, manages jobs, sends invoices.
- **Property owner side:** Joe reviews and approves estimates, sees invoices and pays — all from the link Edgar sends.

Workflow: Joe texts Edgar about a problem → Edgar visits → Edgar describes the work in Spanish in Mano → Mano
writes the English estimate → Edgar sends Joe a secure link → Joe approves → Edgar does the work → Joe gets
the invoice and pays with a supported method.

**Key insight:** Joe shouldn't need to download Mano. He already texts and calls; Mano fits those habits.
(The client link already works this way.)

Possible future: a light **client portal** for one contractor's clients — review and approve estimates, request
changes, view invoices, see job status and past work with that contractor. Mano will **not** build a
property-owner dashboard across many contractors or a property-management system: it only works if all of
Joe's contractors use Mano, and the client link already serves Joe well.

## 12. Expanding beyond contractors (later)

Long-term, Mano could help many kinds of Hispanic-owned businesses. Not all at once — the goal is to find
shared workflows and expand carefully, after contractors work.

- **Construction and home services** (the natural next step): painters, remodelers, roofers, landscapers,
  cleaners, plumbers, electricians, HVAC — estimates, invoices, scheduling, jobs, customer communication.
- **Automotive:** mechanics, tire shops, detailers, tint and body shops — service estimates, work orders,
  invoices, vehicle history.
- **Events and creative services:** photographers, videographers, DJs, decorators, event planners, rentals —
  quotes, packages, deposits, invoices.
- **Beauty and personal care:** barbershops, salons, nail, makeup and lash artists — appointments, deposits,
  reminders, client history.
- **Food and beverage:** taco trucks, taquerías, panaderías, caterers — quotes and invoices for catering and
  events, simple daily sales and expenses by voice.
- **Others:** trucking, printing, tutoring, delivery, independent professionals.

Mano does **not** plan to build point-of-sale systems, card readers, checkout, or inventory. Those are
crowded, hardware- and support-heavy markets (Square, Toast, Clover). Mano connects to them instead.

## 13. One platform, different business experiences

One Mano platform, set up by the type of business. Onboarding could ask "¿Qué tipo de negocio tienes?" and
configure the workspace:

- **Mano Contractors:** estimates, jobs, invoices, payments.
- **Mano Services:** quotes, customers, bookings, invoices.
- **Mano Appointments:** appointments, deposits, reminders, customers.
- **Mano Assistant:** a conversational layer over the tools above.

A shared platform, not several disconnected products.

## 14. Mano Assistant — the bigger opportunity

A bilingual, voice-first business assistant: instead of navigating complicated software, owners manage their
business in natural language.

- Taco truck: "Mano, hoy vendimos 85 tacos de asada y 40 de pastor." → Mano records it in daily sales.
- Barber: "Agenda a Luis para el sábado a las tres." → checks availability, books it, prepares a confirmation.
- Contractor: "Recuérdame cobrarle a Carlos el viernes." → schedules a payment follow-up.
- Anyone: "Mano, ¿qué tengo pendiente hoy?" → appointments, unpaid invoices, pending estimates, follow-ups,
  scheduled jobs, how the business is doing.

Positioning: *You run the business. Mano handles the rest.* For payments, customer messages, or important
records, Mano asks for review and confirmation. Accuracy, trust, privacy and reliability come first.

## 15. Payments — connect, don't rebuild

Square, Toast, Jobber and others already do payments and point of sale. Mano won't rebuild them.

- **Integrated payments:** Mano handles customers, estimates, invoices and payment requests; an established
  provider (for example Stripe) moves the money — cards and bank transfers (ACH) from the client link.
- **Business assistant:** Mano is the smart layer around the tools a business already uses. Possibly the
  stronger difference: the value isn't processing a transaction, it's handling the work around it.

Early focus — the workflow Mano already has: **conversation → estimate → approval → invoice → payment →
follow-up.**

## 16. Possible product roadmap (exploratory)

1. **Contractors:** improve the current product, validate it with real businesses, build trust and repeat use.
2. **Service businesses:** cleaners, landscapers, detailers and others with the same estimate/invoice flow.
3. **Customer experience:** secure approval links, payment requests, job history, a light client portal.
4. **Appointment businesses:** scheduling, reminders, deposits, client relationships.
5. **Connected business assistant:** the workflows together through a bilingual voice-first interface.

Sequencing depends on user research, adoption, technical feasibility and economics.

## 17. The business model (not validated)

- **Software subscriptions:** monthly plans by needs, features or usage.
- **Payments:** possible revenue from integrated payments, depending on the provider's terms.
- **Premium modules:** teams, scheduling, reporting, automation, industry tools.
- **Multi-crew / multi-location plans.**
- **A free entry level** to try Mano before upgrading.

Goal: affordable, transparent pricing that creates measurable value.

## 18. Why Mano could be different (hypotheses to validate)

- **Spanish-first design:** built around how users work and speak, not English software translated.
- **Voice-first:** talk naturally instead of filling forms.
- **Simplicity:** business admin that feels approachable.
- **Cultural understanding:** built with the community, not assumptions about it.
- **Practical usefulness:** real tasks done, not just AI content.
- **Connected workflows:** estimates, customers, messages, invoices and payments together.
- **Human-centered brand:** celebrating the work and people behind small businesses.

## 19. The five-year dream

Imagine Atlanta five years from now. A contractor sends estimates through Mano. A barber books appointments
with Mano. A taco truck logs its daily sales by voice. A property owner approves the work from a link, without downloading anything.
Different businesses, different industries, one recognizable platform — and behind it, four Latino software
engineering students who started with a hackathon project.

The dream is not simply to become a large software company. It is to build a successful Hispanic-founded
technology company while helping other Hispanic entrepreneurs grow. That outcome is aspirational, not
guaranteed. It will take focused execution, customer trust, reliable technology, distribution, capital
discipline, and years of learning.

## 20. The Mano brand manifesto

> **MANO™**
>
> Every business starts somewhere. With an idea. With a skill. With a pair of hands willing to do the work.
>
> Some start in garages. Some in kitchens. Some in trucks. Some on construction sites. Some with nothing more
> than a dream and the determination to make it happen.
>
> We know what it means to build something of your own. We know that behind every business is a person, a
> family, and a reason to keep going.
>
> That's why we created Mano. Not to replace the people doing the work, but to make running their businesses
> a little easier. Because building something shouldn't mean doing everything alone.
>
> A hand to build. A brother to grow with.
>
> Échame la mano.
>
> **MANO™ — Para que nunca emprendas solo.**

## 21. For anyone (or any AI) working on Mano

1. Preserve the current UI unless a redesign is explicitly requested.
2. Follow the forest green, ivory, white, charcoal and muted sage color system.
3. Avoid lime green, generic AI aesthetics, and unnecessarily complex interfaces.
4. Respect Mano's cultural identity and the double meaning of its name.
5. Prioritize practical problems real business owners have.
6. Keep what exists (section 5) separate from what's proposed.
7. Atlanta first for validation, without limiting the broader vision.
8. Focused product work over early expansion. No point of sale, card readers or inventory.
9. Consider technical feasibility, security, privacy, accessibility and business sustainability.
10. Keep the long-term ambition: a meaningful Hispanic-founded technology company that helps entrepreneurs
    succeed.

**Central question:** how can Mano grow from a voice-first estimating tool for Spanish-speaking contractors
into a trusted, bilingual business platform for many industries, without losing the simplicity, authenticity
and human purpose that started it?

**Final principle:** Mano should grow alongside the businesses it serves. The goal isn't just to build a bigger
company. It's to help more people build theirs.
