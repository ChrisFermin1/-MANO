# Mano + Ojo — Project Requirements

## 1. Business Requirements

**BR-01 — Support small service-business owners**

The system shall help small, non-technical service-business owners organize and manage their customer jobs more easily.

**BR-02 — Residential contractor MVP**

The hackathon MVP shall focus on a residential painting/remodeling business as the primary example and demo use case.

**BR-03 — Simplify business workflows**

The system shall turn informal job information into an organized workflow that the business owner can understand and follow.

**BR-04 — Reduce missed information and actions**

The system shall help prevent important job information, customer follow-ups, and payment-related actions from being forgotten.

**BR-05 — Support English and Spanish**

The system shall allow a business owner to describe a job naturally in either English or Spanish.

**BR-06 — Keep the owner in control**

The system shall follow a human-in-the-loop approach. Mano shall not carry out an assisted action until the business owner reviews and approves it.

**BR-07 — Prioritize what matters next**

Instead of overwhelming the business owner with many tasks, the system shall identify what currently requires attention and present the next relevant action.

**BR-08 — Simple user experience**

The system shall provide a clean, professional, and easy-to-understand experience appropriate for users who may not be comfortable with complicated technology.

---

# 2. Functional Requirements

### Job Intake and Business Information

**FR-01 — Enter business information**

The user shall be able to provide basic information about their business.

**FR-02 — Create a new job**

The user shall be able to create a new customer job/project.

**FR-03 — Natural-language job description**

The user shall be able to describe the job naturally rather than manually completing every structured field.

Example:

> “Voy a pintar tres cuartos, reparar el trim y comenzar el martes.”
> 

**FR-04 — English and Spanish input**

The system shall accept job descriptions written in either English or Spanish.

---

### Mano

**FR-05 — Interpret job description**

Mano shall read and interpret the user's job description.

**FR-06 — Extract structured job information**

Mano shall convert the description into structured job information.

This may include information already discussed such as:

- Customer
- Service/project
- Scope of work
- Dates
- Price
- Address
- Notes

**FR-07 — Allow owner review**

The user shall be able to review the information extracted by Mano before continuing.

**FR-08 — Generate quote**

Once the required information is available, Mano shall generate a professional quote based on the job information.

**FR-09 — Generate follow-up assistance**

When Ojo determines that a follow-up is needed, Mano shall be able to generate a follow-up message for the business owner.

**FR-10 — Assist only after approval**

Mano shall require the owner's approval before performing an assisted action.

---

# 3. Ojo Requirements

**FR-11 — Validate required information**

Ojo shall check the structured job information and determine whether important information is missing.

Example:

```
Customer Name     ✓
Service           ✓
Start Date        ✓
Price             ✗
Address           ✗
```

**FR-12 — Identify blockers**

Ojo shall identify missing information or unfinished items that prevent the job from moving to its next stage.

**FR-13 — Monitor job workflow**

Ojo shall monitor the current status of each job.

**FR-14 — Identify next action**

Ojo shall determine what the business owner should address next based on the current job state.

Examples already discussed include:

- Missing information
- Customer follow-up
- Deposit/payment attention
- Job status progression

**FR-15 — Display alerts**

Ojo shall notify the user when something in the workflow requires attention.

---

# 4. Approval and Action Requirements

**FR-16 — Present recommended action**

The system shall present Ojo's recommended next action to the business owner.

Example:

```
Ojo

Maria's quote has not received a response.

Recommended Action:
Follow up with Maria.
```

**FR-17 — Owner approval**

The owner shall be able to review and approve the recommended action.

**FR-18 — Mano assists with approved action**

After approval, Mano shall assist with the action.

For the MVP, the actions we discussed include things such as:

```
Generate Quote
Generate Follow-Up Message
```

**FR-19 — Complete action**

The user shall be able to indicate that an action has been completed.

**FR-20 — Reevaluate workflow**

After an action or job update occurs, Ojo shall reevaluate the job and determine what comes next.

---

# 5. Job State Requirements

The system shall track the job through the states we already defined:

```
New Job
   ↓
Needs Information
   ↓
Ready for Quote
   ↓
Quote Sent
   ↓
Accepted
   ↓
Scheduled
   ↓
In Progress
   ↓
Completed
   ↓
Payment Pending
   ↓
Paid
```

**FR-21 — Track current job state**

Each job shall have a current workflow state.

**FR-22 — Update job state**

The system shall update the job state as the owner completes the appropriate actions.

---

# 6. Dashboard Requirements

**FR-23 — Display active jobs**

The dashboard shall allow the owner to see their active jobs and their current statuses.

**FR-24 — Display Ojo alerts**

The dashboard shall display items Ojo determines require attention.

**FR-25 — Display next action**

The dashboard shall prominently display the next recommended action.