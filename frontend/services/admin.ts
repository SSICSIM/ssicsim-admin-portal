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
  DelegateCreate,
  DelegateOut,
  DelegateUpdate,
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
  createDelegate: (payload: DelegateCreate) => apiClient.post<DelegateOut>("/api/delegates", payload),
  updateDelegate: (delegateId: UUID, payload: DelegateUpdate) =>
    apiClient.patch<DelegateOut>(`/api/delegates/${delegateId}`, payload),
  createAssignment: (payload: AssignmentCreate) => apiClient.post<AssignmentOut>("/api/assignments", payload),
  updateAssignment: (delegateId: UUID, characterId: UUID) =>
    apiClient.patch<AssignmentOut>(`/api/assignments/${delegateId}`, { character_id: characterId }),
  deleteAssignment: (delegateId: UUID) => apiClient.deleteEmpty(`/api/assignments/${delegateId}`),
  uploadCommitteeImage: (committeeId: UUID, formData: FormData) =>
    apiClient.upload(`/api/committees/${committeeId}/image`, formData)
};
