// ── Shared domain types ────────────────────────────────────────────────────

export type JobStatus =
  | "new"
  | "needs_information"
  | "ready_for_quote"
  | "quote_sent"
  | "accepted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "payment_pending"
  | "paid";

export type AlertKind = "quote_waiting" | "follow_up" | "payment_due" | "unread_message";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  preferred_language: "en" | "es";
}

export interface Job {
  id: string;
  customer: Customer;
  title: string;
  description: string;
  status: JobStatus;
  quoted_amount: number | null;
  quote_text: string | null;
  missing_fields: string[] | null; // from Ojo validation
  created_at: string; // ISO string
  updated_at: string;
}

export interface Alert {
  id: string;
  kind: AlertKind;
  job: Job;
  message: string;         // human-readable, already translated
  age_label: string;       // e.g. "3 days"
}

export interface NextAction {
  label: string;           // e.g. "Follow up with Maria"
  job_id: string;
}

export interface DashboardData {
  contractor_name: string;
  alerts: Alert[];
  next_action: NextAction | null;
  active_job_count: number;
}

// ── Mano AI extraction ─────────────────────────────────────────────────────

export interface ManoExtraction {
  service: string | null;
  customer_name: string | null;
  rooms: number | null;
  trim_repair: boolean | null;
  start_date: string | null;  // ISO date
  price: number | null;
  address: string | null;
}

export interface OjoValidation {
  ready: boolean;
  missing_fields: string[];
  message: string; // e.g. "Missing price and customer address."
}

// ── API response wrapper ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  ok: boolean;
  error?: string;
}
