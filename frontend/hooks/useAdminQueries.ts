"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin";
import type {
  AssignmentCreate,
  CharacterCreate,
  CommitteeCreate,
  CommitteeUpdate,
  DelegationUpdate,
  DelegateCreate,
  DelegateUpdate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
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

// Query hooks
export function useCommittees() {
  return useQuery({
    queryKey: queryKeys.committees,
    queryFn: () => adminService.fetchCommittees()
  });
}

export function useCreateCommittee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitteeCreate) => adminService.createCommittee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.committees });
    }
  });
}

// Query hooks
export function useCommittee(id?: UUID) {
  return useQuery({
    queryKey: id ? queryKeys.committee(id) : ["committee", "missing"],
    queryFn: () => adminService.fetchCommittee(id as UUID),
    enabled: Boolean(id)
  });
}

// Mutation hooks
export function useUpdateCommittee(id: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommitteeUpdate) => adminService.updateCommittee(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.committee(id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.committees });
    }
  });
}

// Query hooks
export function useCharacters() {
  return useQuery({
    queryKey: queryKeys.characters,
    queryFn: () => adminService.fetchCharacters()
  });
}

// Mutation hooks
export function useCreateCharacter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CharacterCreate) => adminService.createCharacter(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
    }
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (characterId: UUID) => adminService.deleteCharacter(characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
    }
  });
}

export function useUpdateDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: DelegationUpdate }) =>
      adminService.updateDelegation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegations });
    }
  });
}

// Query hooks
export function useDelegates() {
  return useQuery({
    queryKey: queryKeys.delegates,
    queryFn: () => adminService.fetchDelegates()
  });
}

// Query hooks
export function useDelegations() {
  return useQuery({
    queryKey: queryKeys.delegations,
    queryFn: () => adminService.fetchDelegations()
  });
}

// Mutation hooks
export function useCreateDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DelegateCreate) => adminService.createDelegate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useUpdateDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { delegateId: UUID; data: DelegateUpdate }) =>
      adminService.updateDelegate(payload.delegateId, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useDeleteDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delegateId: UUID) => adminService.deleteDelegate(delegateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
    }
  });
}

// Mutation hooks
export function useAssignDelegate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignmentCreate) => adminService.createAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useUpdateAssignment(delegateId: UUID) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (characterId: UUID) => adminService.updateAssignment(delegateId, characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delegateId: UUID) => adminService.deleteAssignment(delegateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
    }
  });
}

// Email template hooks
export function useEmailTemplates() {
  return useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => adminService.fetchEmailTemplates()
  });
}

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmailTemplateCreate) => adminService.createEmailTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
    }
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: EmailTemplateUpdate }) =>
      adminService.updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
    }
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => adminService.deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
    }
  });
}

export function useUploadCommitteeImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ committeeId, formData }: { committeeId: UUID; formData: FormData }) =>
      adminService.uploadCommitteeImage(committeeId, formData),
    onSuccess: (_, { committeeId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.committee(committeeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.committees });
    }
  });
}

export function useQueueEmails() {
  return useMutation({
    mutationFn: (payload: { recipients: Record<string, string>[]; subject: string; body: string }) =>
      adminService.queueEmails(payload)
  });
}

export function useValidateEmails() {
  return useMutation({
    mutationFn: (emails: string[]) => adminService.validateEmails(emails)
  });
}

