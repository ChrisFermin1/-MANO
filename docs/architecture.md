Architecture Style: Layered Modular Architecture + State-Based Workflow
## 1) High-Level Flow


```
Carlos (Owner)
    ↓
Enters / describes a new job
    ↓
MANO
Interprets and structures the job information
    ↓
OJO
Checks for missing info / blockers
    ↓
Carlos reviews and fills missing details
    ↓
MANO
Generates the quote
    ↓
Job is saved / updated
    ↓
OJO
Monitors workflow and determines next action
    ↓
Carlos approves the action
    ↓
MANO
Helps execute the approved action
    ↓
Action completed
    ↓
OJO
Updates workflow and identifies what comes next
```

---

## 2) Layered Architecture


```
┌──────────────────────────────────────────────┐
│                PRESENTATION LAYER            │
│----------------------------------------------│
│ Dashboard                                    │
│ New Job Form                                 │
│ Quote Review                                 │
│ Ojo Alerts                                   │
└──────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────┐
│                APPLICATION LAYER             │
│----------------------------------------------│
│ Job Management                               │
│ Approval Workflow                            │
│ Quote Workflow                               │
│ Action Management                            │
└──────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────┐
│                  DOMAIN LAYER                │
│----------------------------------------------│
│ MANO                                         │
│ - Interpret input                            │
│ - Structure job info                         │
│ - Generate quote                             │
│ - Generate follow-up message                 │
│ - Assist with approved actions               │
│                                              │
│ JOB                                          │
│ - Customer                                   │
│ - Project                                    │
│ - Quote                                      │
│ - Status                                     │
│ - Tasks / Alerts                             │
│                                              │
│ OJO                                          │
│ - Validate required info                     │
│ - Monitor workflow                           │
│ - Detect blockers                            │
│ - Prioritize next action                     │
│ - Raise alerts                               │
└──────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────┐
│                   DATA LAYER                 │
│----------------------------------------------│
│ Business                                     │
│ Customer                                     │
│ Job                                          │
│ Quote                                        │
│ Action                                       │
│ Alert                                        │
└──────────────────────────────────────────────┘
```

---

## 3) Core Relationship Between Carlos, Mano, and Ojo


```
Carlos approves
(reviews information, approves quote or action)
        ↓
Mano executes
(performs the approved action)
        ↓
Job state updates
(job moves forward)
        ↓
Ojo determines next action
(checks missing info, monitors progress, prioritizes next step)
        ↓
Carlos reviews again
```

### Simple meaning:

- **Mano = Help / Execute**
- **Ojo = Watch / Prioritize**
- **Carlos = Human in the loop**

---

## 4) Job Workflow State Model

1. New Job
    ↓
2. Needs Information
   - Ojo checks missing details
    ↓
3. Ready for Quote
   - Mano generates quote
    ↓
4. Quote Sent
   - Ojo watches for follow-up
    ↓
5. Accepted
    ↓
6. Scheduled
    ↓
7. In Progress
    ↓
8. Completed
    ↓
9. Payment Pending
   - Ojo reminds about payment
    ↓
10. Paid