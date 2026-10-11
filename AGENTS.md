# Mano + Ojo Development Instructions

## Project Documentation

Before implementing or modifying application behavior, read:

- docs/requirements.md
- docs/architecture.md
- docs/technical-design.md

These documents define the approved MVP scope and architecture.

Do not invent new requirements, job states, database fields,
API contracts, workflow behavior, or features that conflict
with these documents.

If an implementation detail is undefined, identify it instead
of silently making a product decision.

## Project

Mano is a bilingual business assistant designed to help
small, non-technical service-business owners turn informal
job information into organized business workflows.

Mano interprets English or Spanish job descriptions,
structures job information, generates business documents
such as quotes, and assists with approved actions.

Ojo is Mano's workflow monitoring component. It validates
job information, detects blockers and missing information,
monitors job progress, and recommends the next action the
business owner should take.

The hackathon MVP focuses on residential painting and
remodeling businesses as the primary use case.

The system follows a human-in-the-loop approach:

Ojo recommends → Owner reviews → Owner approves → Mano assists

## Architecture

Use a Layered Modular Architecture with a
State-Based Job Workflow.

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- Python
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL

AI:
- Gemini API
- AI functionality belongs to Mano.

## Responsibilities

Mano:
- Interpret English/Spanish job descriptions
- Extract structured job information
- Generate quotes
- Generate follow-up messages

Ojo:
- Validate required job information
- Determine job state
- Detect blockers
- Determine next action
- Create alerts

Ojo business rules should remain deterministic
when possible instead of asking the AI model.

## Human Approval

Do not automatically execute business actions.

Flow:

Ojo recommends
→ Carlos reviews
→ Carlos approves
→ Mano assists

## Scope

Do not add features outside the documented MVP
requirements unless explicitly requested.

## Development

- Keep modules small.
- Reuse existing models and services.
- Do not expose API keys.
- Do not commit .env files.
- Run existing tests after changes.