import { apiClient } from "@/lib/apiClient";
import type {
  CheckInOut,
  AssignmentCreate,
  AssignmentOut,
  CharacterCreate,
  CharacterOut,
  CommitteeCreate,
  CommitteeOut,
  CommitteeUpdate,
  DelegationOut,
  DelegationUpdate,
  DelegateBulkEditRequest,
  DelegateBulkEditResult,
  DelegateCreate,
  DelegateOut,
  DelegateUpdate,
  EmailTemplateCreate,
  EmailTemplateOut,
  EmailTemplateUpdate,
  EventCharacterCreate,
  EventCharacterOut,
  EventLogOut,
  EventOut,
  EventRegistrationCreate,
  EventRegistrationOut,
  EventRegistrationUpdate,
  EventUpdate,
  SecMemberOut,
  UUID
} from "@/types/api";

export const adminService = {
  // ─── committees ─────────────────────────────────────────────────────────────
  fetchCommittees: () => apiClient.get<CommitteeOut[]>("/api/committees"),
  fetchCommittee: (id: UUID) => apiClient.get<CommitteeOut>(`/api/committees/${id}`),
  createCommittee: (payload: CommitteeCreate) =>
    apiClient.post<CommitteeOut>("/api/committees", payload),
  updateCommittee: (id: UUID, payload: CommitteeUpdate) =>
    apiClient.patch<CommitteeOut>(`/api/committees/${id}`, payload),
  uploadCommitteeImage: (committeeId: UUID, formData: FormData) =>
    apiClient.upload(`/api/committees/${committeeId}/image`, formData),

  // ─── characters ─────────────────────────────────────────────────────────────
  fetchCharacters: () => apiClient.get<CharacterOut[]>("/api/characters"),
  createCharacter: (payload: CharacterCreate) =>
    apiClient.post<CharacterOut>("/api/characters", payload),
  deleteCharacter: (characterId: UUID) => apiClient.deleteEmpty(`/api/characters/${characterId}`),

  // ─── delegates ──────────────────────────────────────────────────────────────
  fetchDelegates: () => apiClient.get<DelegateOut[]>("/api/delegates"),
  createDelegate: (payload: DelegateCreate) =>
    apiClient.post<DelegateOut>("/api/delegates", payload),
  updateDelegate: (delegateId: UUID, payload: DelegateUpdate) =>
    apiClient.patch<DelegateOut>(`/api/delegates/${delegateId}`, payload),
  deleteDelegate: (delegateId: UUID) => apiClient.deleteEmpty(`/api/delegates/${delegateId}`),
  bulkEditDelegates: (payload: DelegateBulkEditRequest) =>
    apiClient.post<DelegateBulkEditResult>("/api/delegates/bulk-edit", payload),

  // ─── delegations ────────────────────────────────────────────────────────────
  fetchDelegations: () => apiClient.get<DelegationOut[]>("/api/delegations"),
  updateDelegation: (id: UUID, payload: DelegationUpdate) =>
    apiClient.patch<DelegationOut>(`/api/delegations/${id}`, payload),

  // ─── assignments ────────────────────────────────────────────────────────────
  createAssignment: (payload: AssignmentCreate) =>
    apiClient.post<AssignmentOut>("/api/assignments", payload),
  updateAssignment: (delegateId: UUID, characterId: UUID) =>
    apiClient.patch<AssignmentOut>(`/api/assignments/${delegateId}`, { character_id: characterId }),
  deleteAssignment: (delegateId: UUID) => apiClient.deleteEmpty(`/api/assignments/${delegateId}`),

  // ─── email ──────────────────────────────────────────────────────────────────
  queueEmails: (payload: { recipients: Record<string, string>[]; subject: string; body: string }) =>
    apiClient.post<{ job_id: string; queued: number; status: string; error?: string }>(
      "/api/email/queue",
      payload
    ),
  validateEmails: (emails: string[]) =>
    apiClient.post<{ email: string; valid: boolean; normalized?: string; reason?: string }[]>(
      "/api/email/validate",
      { emails }
    ),

  // ─── email templates ────────────────────────────────────────────────────────
  fetchEmailTemplates: () => apiClient.get<EmailTemplateOut[]>("/api/email-templates"),
  createEmailTemplate: (payload: EmailTemplateCreate) =>
    apiClient.post<EmailTemplateOut>("/api/email-templates", payload),
  updateEmailTemplate: (id: UUID, payload: EmailTemplateUpdate) =>
    apiClient.patch<EmailTemplateOut>(`/api/email-templates/${id}`, payload),
  deleteEmailTemplate: (id: UUID) => apiClient.deleteEmpty(`/api/email-templates/${id}`),

  // ─── events ─────────────────────────────────────────────────────────────────
  fetchEvents: () => apiClient.get<EventOut[]>("/api/events"),
  fetchEvent: (slug: string) => apiClient.get<EventOut>(`/api/events/${slug}`),
  updateEvent: (slug: string, payload: EventUpdate) =>
    apiClient.patch<EventOut>(`/api/events/${slug}`, payload),
  fetchEventRegistrations: (slug: string) =>
    apiClient.get<EventRegistrationOut[]>(`/api/events/${slug}/registrations`),
  createEventRegistration: (slug: string, payload: EventRegistrationCreate) =>
    apiClient.post<EventRegistrationOut>(`/api/events/${slug}/registrations`, payload),
  updateEventRegistration: (slug: string, id: UUID, payload: EventRegistrationUpdate) =>
    apiClient.patch<EventRegistrationOut>(`/api/events/${slug}/registrations/${id}`, payload),
  deleteEventRegistration: (slug: string, id: UUID) =>
    apiClient.deleteEmpty(`/api/events/${slug}/registrations/${id}`),
  fetchCheckIns: () => apiClient.get<CheckInOut[]>("/api/events/check-ins"),
  undoCheckIn: (slug: string, id: UUID) =>
    apiClient.deleteEmpty(`/api/events/${slug}/registrations/${id}/check-in`),
  fetchEventCharacters: (slug: string) =>
    apiClient.get<EventCharacterOut[]>(`/api/events/${slug}/characters`),
  createEventCharacter: (slug: string, payload: EventCharacterCreate) =>
    apiClient.post<EventCharacterOut>(`/api/events/${slug}/characters`, payload),
  deleteEventCharacter: (slug: string, id: UUID) =>
    apiClient.deleteEmpty(`/api/events/${slug}/characters/${id}`),
  assignEventCharacter: (slug: string, characterId: UUID, registrationId: UUID) =>
    apiClient.post<EventCharacterOut>(`/api/events/${slug}/characters/${characterId}/assign`, {
      registration_id: registrationId
    }),
  unassignEventCharacter: (slug: string, characterId: UUID) =>
    apiClient.delete<EventCharacterOut>(`/api/events/${slug}/characters/${characterId}/assign`),

  // ─── activity log ───────────────────────────────────────────────────────────
  fetchEventLogs: () => apiClient.get<EventLogOut[]>("/api/logs"),
  fetchSecMembers: () => apiClient.get<SecMemberOut[]>("/api/sec-members")
};
