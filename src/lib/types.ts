export type Role = "STUDENT" | "COUNSELLOR" | "CLASS_COORDINATOR" | "HOD" | "ADMIN" | "MANAGER";

export type Stage = "COUNSELLOR" | "CLASS_COORDINATOR" | "HOD" | "DONE";

export type ODStatus = "PENDING" | "DECLINED" | "COMPLETED" | "RETURNED_FOR_CORRECTION";

export type Category = "SPORTS" | "TECHNICAL" | "NON_TECHNICAL" | "OTHERS";

export type StaffRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  created_at: string;
}

export interface StaffRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  requested_role: Exclude<Role, "STUDENT" | "ADMIN">;
  department: string;
  status: StaffRequestStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ODRequest {
  id: string;
  student_id: string;
  student_name: string;
  department: string;
  proof_file_path: string | null;
  od_date: string;
  category: Category;
  reason: string;
  current_stage: Stage;
  status: ODStatus;
  declined_by: string | null;
  decline_reason: string | null;
  counsellor_id: string | null;
  counsellor_name: string | null;
  counsellor_remark: string | null;
  coordinator_id: string | null;
  coordinator_name: string | null;
  coordinator_remark: string | null;
  hod_id: string | null;
  hod_name: string | null;
  hod_remark: string | null;
  pdf_generated: boolean;
  is_escalated?: boolean;
  last_stage_updated_at?: string;
  history?: ApprovalHistory[];
  created_at: string;
  updated_at: string;
}

export interface ApprovalHistory {
  id: string;
  od_request_id: string;
  stage: Stage;
  action:
    | "SUBMITTED"
    | "APPROVED"
    | "REJECTED_TO_PREVIOUS"
    | "REJECTED_FINAL"
    | "RETURNED_FOR_CORRECTION"
    | "RESUBMITTED"
    | "ESCALATED";
  actor_id: string;
  actor_name: string;
  actor_role: Role;
  comments: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  SPORTS: "Sports",
  TECHNICAL: "Technical Event",
  NON_TECHNICAL: "Non-Technical Event",
  OTHERS: "Others",
};

export const STAGE_LABELS: Record<Stage, string> = {
  COUNSELLOR: "Counsellor",
  CLASS_COORDINATOR: "Class Coordinator",
  HOD: "HOD",
  DONE: "Completed",
};

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  COUNSELLOR: "Counsellor",
  CLASS_COORDINATOR: "Class Coordinator",
  HOD: "HOD",
  ADMIN: "Admin",
  MANAGER: "Manager",
};
