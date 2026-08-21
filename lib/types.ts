export type AppointmentStatus = "approved" | "pending" | "declined";

export interface YearSummary {
  year: number;
  created: number;
  approved: number;
  declined: number;
  pendingLive: number;
  abandoned: number; // soft-deleted while still pending
  deletedApproved: number;
  deletedDeclined: number;
  collected: number; // sum(payment.amount) where approved and service date is in the past/today
  approvedFuture: number;
  outstanding: number; // sum(payment.amount) where pending and live
  lost: number; // sum(payment.amount) where declined
  completed: number;
  expired: number;
  avgValue: number;
}

export interface MonthSummary {
  year: number;
  month: number; // 1-12
  created: number;
  approved: number;
  declined: number;
  pendingLive: number;
  abandoned: number;
  deletedApproved: number;
  deletedDeclined: number;
  collected: number;
  approvedFuture: number;
  outstanding: number;
  lost: number;
  completed: number;
  expired: number;
  avgValue: number;
}

export interface CompanySummary {
  companyId: string | null;
  companyName: string;
  totalAppointments: number;
  approved: number;
  declined: number;
  pendingLive: number;
  abandoned: number;
  deletedApproved: number;
  deletedDeclined: number;
  collected: number;
  approvedFuture: number;
  outstanding: number;
  lost: number;
  completed: number;
  expired: number;
  declineRate: number;
}

export interface ClinicSummary {
  clinic: string;
  totalAppointments: number;
  approved: number;
  declined: number;
  pendingLive: number;
  abandoned: number;
  deletedApproved: number;
  deletedDeclined: number;
  collected: number;
  approvedFuture: number;
  outstanding: number;
  lost: number;
  completed: number;
  expired: number;
}

export interface EmployeeSummary {
  userId: string;
  name: string;
  totalAppointments: number;
  approved: number;
  declined: number;
  pendingLive: number;
  abandoned: number;
  deletedApproved: number;
  deletedDeclined: number;
  collected: number;
  approvedFuture: number;
  completed: number;
  expired: number;
}

export interface OverviewTotals {
  totalAppointments: number;
  approved: number;
  declined: number;
  pendingLive: number;
  abandoned: number;
  deletedApproved: number;
  deletedDeclined: number;
  collected: number;
  approvedFuture: number;
  outstanding: number;
  lost: number;
  completed: number; // approved and details.date is today/past
  expired: number; // pending live and details.date is in the past
  avgValue: number;
  duplicateIdCount: number;
  earliestDate: string | null;
  latestDate: string | null;
}
