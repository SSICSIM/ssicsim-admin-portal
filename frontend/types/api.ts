export type UUID = string;

export type CommitteeOut = {
  id: UUID;
  name: string;
  small_description: string | null;
  large_description: string | null;
  director_name: string | null;
  director_image_url: string | null;
  contact_email: string | null;
  max_delegates: number | null;
  joint: boolean;
  double: boolean;
  background_guide_link: string | null;
  mechanics_guide_link: string | null;
  character_guide_link: string | null;
  image_url: string | null;
};

export type CommitteeUpdate = Partial<Omit<CommitteeOut, "id">>;

export type CommitteeCreate = Omit<CommitteeOut, "id" | "image_url"> & {
  image_url?: string | null;
};

export type DelegateExperience = "Beginner" | "Intermediate" | "Expertise";
export type DelegateStatus = "Awaiting Payment" | "Verify Payment" | "Awaiting Assignment" | "Assigned" | "Confirmed";
export type FinancialAidStatus = "Yes" | "No" | "Delegation Paying";

export type DelegateOut = {
  id: UUID;
  first_name: string;
  last_name: string;
  full_name: string | null;
  preferred_name: string | null;
  grade: string | null;
  email: string;
  phone: string | null;
  delegate_experience: DelegateExperience;
  first_committee: string | null;
  second_committee: string | null;
  third_committee: string | null;
  committee_selection_ack: boolean | null;
  date_applied: string | null;
  delegate_status: DelegateStatus;
  delegation_id: UUID | null;
  code_of_conduct_url: string | null;
  code_of_conduct_signed: boolean | null;
  payment_policy_ack: boolean | null;
  cancellation_policy_ack: boolean | null;
  financial_aid_status: FinancialAidStatus | null;
  financial_aid_reason: string | null;
  financial_aid_contacted: boolean | null;
  payment_receipt_url: string | null;
  heard_about: string | null;
  notes: string | null;
};

export type DelegationOut = {
  id: UUID;
  name: string;
  faculty_advisor_first_name: string | null;
  faculty_advisor_last_name: string | null;
  faculty_advisor_email: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  school_address: string | null;
  delegation_size: number | null;
  delegation_size_min: number | null;
  delegation_size_max: number | null;
  attended_before: boolean | null;
  payment_process: string | null;
  policy_ack_registration: boolean | null;
  policy_ack_payment: boolean | null;
  policy_ack_cancellation: boolean | null;
  policy_ack_conduct: boolean | null;
  policy_ack_photography: boolean | null;
  heard_about: string | null;
  notes: string | null;
  head_delegate_id: UUID | null;
};

export type DelegationUpdate = Partial<Omit<DelegationOut, "id">>;

export type DelegateUpdate = Partial<Omit<DelegateOut, "id">>;

export type DelegateCreate = Omit<DelegateOut, "id" | "date_applied"> & {
  date_applied?: string | null;
};

export type CharacterOut = {
  id: UUID;
  name: string;
  committee_id: UUID;
  delegate_id: UUID | null;
};

export type CharacterCreate = {
  name: string;
  committee_id: UUID;
  delegate_id?: UUID | null;
};

export type AssignmentCreate = {
  delegate_id: UUID;
  character_id: UUID;
};

export type AssignmentOut = {
  delegate_id: UUID;
  character_id: UUID;
  committee_id: UUID;
};

export type EmailTemplateOut = {
  id: UUID;
  name: string;
  subject_template: string;
  body_template: string;
  placeholders: string[] | null;
  confirms_assigned: boolean;
  confirms_payment: boolean;
  created_at: string;
  updated_at: string;
};

export type EmailTemplateCreate = {
  name: string;
  subject_template: string;
  body_template: string;
  placeholders?: string[] | null;
  confirms_assigned?: boolean;
  confirms_payment?: boolean;
};

export type EmailTemplateUpdate = Partial<EmailTemplateCreate>;

export type EventType = "Assignment" | "Email" | "Committee Update" | "Status Change" | "Unassignment" | "Financial Aid Contact";

export type EventLogOut = {
  id: UUID;
  sec_member_id: UUID | null;
  timestamp: string | null;
  event_type: EventType;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
};

export type SecMemberOut = {
  id: UUID;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  last_logged_in: string | null;
};

