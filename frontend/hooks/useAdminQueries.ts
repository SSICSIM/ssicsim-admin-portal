"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export const queryKeys = {
  committees: ["committees"] as const,
  committee: (id: UUID) => ["committee", id] as const,
  characters: ["characters"] as const,
  delegates: ["delegates"] as const,
  delegations: ["delegations"] as const,
  assignments: ["assignments"] as const
};

export function useCommittees() {
  return useQuery({
    queryKey: queryKeys.committees,
    queryFn: async () => apiClient.get<CommitteeOut[]>("/api/committees")
  });
}

export function useCreateCommittee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitteeCreate) => apiClient.post<CommitteeOut>("/api/committees", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.committees });
    }
  });
}

export function useCommittee(id?: UUID) {
  return useQuery({
    queryKey: id ? queryKeys.committee(id) : ["committee", "missing"],
    queryFn: async () => apiClient.get<CommitteeOut>(`/api/committees/${id}`),
    enabled: Boolean(id)
  });
}

export function useUpdateCommittee(id: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitteeUpdate) => apiClient.patch<CommitteeOut>(`/api/committees/${id}`, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.committee(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.committees });
    }
  });
}

export function useCharacters() {
  return useQuery({
    queryKey: queryKeys.characters,
    queryFn: async () => apiClient.get<CharacterOut[]>("/api/characters")
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CharacterCreate) => apiClient.post<CharacterOut>("/api/characters", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
    }
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (characterId: UUID) => apiClient.deleteEmpty(`/api/characters/${characterId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
    }
  });
}

export function useDelegates() {
  return useQuery({
    queryKey: queryKeys.delegates,
    queryFn: async () => apiClient.get<DelegateOut[]>("/api/delegates")
  });
}

export function useDelegations() {
  return useQuery({
    queryKey: queryKeys.delegations,
    queryFn: async () => apiClient.get<DelegationOut[]>("/api/delegations")
  });
}

export function useCreateDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DelegateCreate) => apiClient.post<DelegateOut>("/api/delegates", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useUpdateDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { delegateId: UUID; data: DelegateUpdate }) =>
      apiClient.patch<DelegateOut>(`/api/delegates/${payload.delegateId}`, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useAssignDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignmentCreate) =>
      apiClient.post<AssignmentOut>("/api/assignments", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useUpdateAssignment(delegateId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (characterId: UUID) =>
      apiClient.patch<AssignmentOut>(`/api/assignments/${delegateId}`, { character_id: characterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delegateId: UUID) => apiClient.deleteEmpty(`/api/assignments/${delegateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

