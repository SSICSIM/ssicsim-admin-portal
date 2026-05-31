export type UUID = string;

export type CommitteeOut = {
  id: UUID;
  name: string;
  small_description: string | null;
  large_description: string | null;
  director_name: string | null;
  chair_name: string | null;
  crisis_analysts: string[] | null;
  max_delegates: number | null;
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
export type DelegateStatus = "Awaiting Payment" | "Awaiting Assignment" | "Assigned" | "Confirmed";

export type DelegateOut = {
  id: UUID;
  first_name: string;
  last_name: string;
  full_name: string | null;
  preferred_name: string | null;
  grade: string | null;
  email: string;
  delegate_experience: DelegateExperience;
  first_committee: string | null;
  second_committee: string | null;
  third_committee: string | null;
  date_applied: string | null;
  delegate_status: DelegateStatus;
  delegation_id: UUID | null;
  code_of_conduct_url: string | null;
  code_of_conduct_signed: boolean | null;
  payment_policy_ack: boolean | null;
  cancellation_policy_ack: boolean | null;
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
  school_address: string | null;
  delegation_size: number | null;
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
  created_at: string;
  updated_at: string;
};

export type EmailTemplateCreate = {
  name: string;
  subject_template: string;
  body_template: string;
  placeholders?: string[] | null;
  confirms_assigned?: boolean;
};

export type EmailTemplateUpdate = Partial<EmailTemplateCreate>;

