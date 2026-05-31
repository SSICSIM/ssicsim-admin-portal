import { apiClient } from "@/lib/apiClient";
import type {
  AssignmentCreate,
  AssignmentOut,
  CharacterCreate,
  CharacterOut,
  CommitteeCreate,
  CommitteeOut,
  CommitteeUpdate,
  DelegationOut,
  DelegationUpdate,
  DelegateCreate,
  DelegateOut,
  DelegateUpdate,
  EmailTemplateCreate,
  EmailTemplateOut,
  EmailTemplateUpdate,
  UUID
} from "@/types/api";

export const adminService = {
  fetchCommittees: () => apiClient.get<CommitteeOut[]>("/api/committees"),
  createCommittee: (payload: CommitteeCreate) => apiClient.post<CommitteeOut>("/api/committees", payload),
  fetchCommittee: (id: UUID) => apiClient.get<CommitteeOut>(`/api/committees/${id}`),
  updateCommittee: (id: UUID, payload: CommitteeUpdate) =>
    apiClient.patch<CommitteeOut>(`/api/committees/${id}`, payload),
  fetchCharacters: () => apiClient.get<CharacterOut[]>("/api/characters"),
  createCharacter: (payload: CharacterCreate) => apiClient.post<CharacterOut>("/api/characters", payload),
  deleteCharacter: (characterId: UUID) => apiClient.deleteEmpty(`/api/characters/${characterId}`),
  fetchDelegates: () => apiClient.get<DelegateOut[]>("/api/delegates"),
  fetchDelegations: () => apiClient.get<DelegationOut[]>("/api/delegations"),
  updateDelegation: (id: UUID, payload: DelegationUpdate) =>
    apiClient.patch<DelegationOut>(`/api/delegations/${id}`, payload),
  createDelegate: (payload: DelegateCreate) => apiClient.post<DelegateOut>("/api/delegates", payload),
  updateDelegate: (delegateId: UUID, payload: DelegateUpdate) =>
    apiClient.patch<DelegateOut>(`/api/delegates/${delegateId}`, payload),
  deleteDelegate: (delegateId: UUID) =>
    apiClient.deleteEmpty(`/api/delegates/${delegateId}`),
  createAssignment: (payload: AssignmentCreate) => apiClient.post<AssignmentOut>("/api/assignments", payload),
  updateAssignment: (delegateId: UUID, characterId: UUID) =>
    apiClient.patch<AssignmentOut>(`/api/assignments/${delegateId}`, { character_id: characterId }),
  deleteAssignment: (delegateId: UUID) => apiClient.deleteEmpty(`/api/assignments/${delegateId}`),
  uploadCommitteeImage: (committeeId: UUID, formData: FormData) =>
    apiClient.upload(`/api/committees/${committeeId}/image`, formData),

  // Email sending (queued via RQ worker)
  queueEmails: (payload: { recipients: Record<string, string>[]; subject: string; body: string }) =>
    apiClient.post<{ job_id: string; queued: number; status: string; error?: string }>(
      "/api/email/queue",
      payload
    ),

  // Email validation — syntax + DNS MX check
  validateEmails: (emails: string[]) =>
    apiClient.post<{ email: string; valid: boolean; normalized?: string; reason?: string }[]>(
      "/api/email/validate",
      { emails }
    ),

  // Email templates
  fetchEmailTemplates: () =>
    apiClient.get<EmailTemplateOut[]>("/api/email-templates"),
  createEmailTemplate: (payload: EmailTemplateCreate) =>
    apiClient.post<EmailTemplateOut>("/api/email-templates", payload),
  updateEmailTemplate: (id: UUID, payload: EmailTemplateUpdate) =>
    apiClient.patch<EmailTemplateOut>(`/api/email-templates/${id}`, payload),
  deleteEmailTemplate: (id: UUID) =>
    apiClient.deleteEmpty(`/api/email-templates/${id}`)
};
