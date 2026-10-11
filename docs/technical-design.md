# Mano + Ojo — Technical Design

## 1. Technology Stack

| Area | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI |
| Validation | Pydantic |
| Persistence | PostgreSQL |
| ORM | SQLAlchemy |
| Database Migrations | Alembic |
| AI | Gemini API |
| Containers | Docker / Docker Compose |

---

## 2. System Responsibilities

### Mano

Mano contains AI-assisted functionality.

Responsibilities:

- Interpret English or Spanish job descriptions
- Extract structured job information
- Generate professional quote content
- Generate follow-up messages
- Assist with actions after owner approval

Mano shall not determine deterministic business workflow rules
when those rules can be handled by application logic.

### Ojo

Ojo contains deterministic business and workflow logic.

Responsibilities:

- Validate required job information
- Detect missing information
- Detect workflow blockers
- Determine the current job state
- Determine the next recommended action
- Generate workflow alerts

---

## 3. Human-in-the-Loop Rule

Business actions shall follow:

Ojo recommends
    ↓
Carlos reviews
    ↓
Carlos approves
    ↓
Mano assists
    ↓
Job state updates
    ↓
Ojo reevaluates

Mano shall not automatically perform an assisted business action
without owner approval.

---

## 4. Job States

The canonical job states for the MVP are:

NEW
NEEDS_INFORMATION
READY_FOR_QUOTE
QUOTE_SENT
ACCEPTED
SCHEDULED
IN_PROGRESS
COMPLETED
PAYMENT_PENDING
PAID

These state names should be used consistently throughout
the backend and frontend.

---

## 5. Core Domain Entities

The MVP contains the following domain entities:

- Business
- Customer
- Job
- Quote
- Action
- Alert

Detailed database fields and relationships must be defined
before implementing the persistence layer.

---

## 6. Application Modules

### Job Management
Responsible for managing jobs and their current state.

### Quote Workflow
Responsible for the quote lifecycle.

### Approval Workflow
Responsible for owner review and approval before Mano-assisted actions.

### Action Management
Responsible for recommended and completed actions.

### Mano Module
Responsible for AI-assisted interpretation and generation.

### Ojo Module
Responsible for validation, monitoring, blockers, alerts,
and next-action determination.

---

## 7. Communication

The frontend communicates with the backend through REST/JSON.

The backend communicates with PostgreSQL for persistence.

The Mano backend module communicates with the Gemini API
for AI-assisted operations.

Ojo remains application/business logic and should use
deterministic rules wherever possible.

---

## 8. Containerization

The development environment will use Docker / Docker Compose.

The application will contain:

Frontend
    ↓
Backend
    ↓
PostgreSQL

The backend also communicates externally with the Gemini API.

---

## 9. Still To Be Defined

The following implementation details have not yet been finalized:

- Exact database fields and relationships
- Exact API endpoints and request/response contracts
- Exact Ojo state-transition rules
- Exact required fields for determining job readiness

Codex must not invent these decisions unless explicitly instructed.