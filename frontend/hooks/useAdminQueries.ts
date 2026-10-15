"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin";
import type {
  AssignmentCreate,
  CharacterCreate,
  CommitteeCreate,
  CommitteeUpdate,
  DelegationUpdate,
  DelegateBulkEditRequest,
  DelegateCreate,
  DelegateUpdate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
  EventCharacterCreate,
  EventRegistrationCreate,
  EventRegistrationUpdate,
  EventUpdate,
  UUID
} from "@/types/api";

export const queryKeys = {
  committees: ["committees"] as const,
  committee: (id: UUID) => ["committee", id] as const,
  characters: ["characters"] as const,
  delegates: ["delegates"] as const,
  delegations: ["delegations"] as const,
  assignments: ["assignments"] as const,
  eventLogs: ["eventLogs"] as const,
  secMembers: ["secMembers"] as const,
  events: ["events"] as const,
  event: (slug: string) => ["event", slug] as const,
  eventRegistrations: (slug: string) => ["eventRegistrations", slug] as const,
  eventCharacters: (slug: string) => ["eventCharacters", slug] as const
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
export function useDelegates(enabled = true) {
  return useQuery({
    queryKey: queryKeys.delegates,
    queryFn: () => adminService.fetchDelegates(),
    enabled
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

export function useBulkEditDelegates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DelegateBulkEditRequest) => adminService.bulkEditDelegates(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.delegates });
      queryClient.invalidateQueries({ queryKey: queryKeys.characters });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventLogs });
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
    mutationFn: (payload: {
      recipients: Record<string, string>[];
      subject: string;
      body: string;
    }) => adminService.queueEmails(payload)
  });
}

export function useValidateEmails() {
  return useMutation({
    mutationFn: (emails: string[]) => adminService.validateEmails(emails)
  });
}

// Activity log hooks
export function useEventLogs() {
  return useQuery({
    queryKey: queryKeys.eventLogs,
    queryFn: () => adminService.fetchEventLogs()
  });
}

export function useSecMembers() {
  return useQuery({
    queryKey: queryKeys.secMembers,
    queryFn: () => adminService.fetchSecMembers()
  });
}

// Event hooks
export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: () => adminService.fetchEvents()
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: queryKeys.event(slug),
    queryFn: () => adminService.fetchEvent(slug)
  });
}

export function useEventRegistrations(slug: string | undefined) {
  return useQuery({
    queryKey: slug ? queryKeys.eventRegistrations(slug) : ["eventRegistrations", "none"],
    queryFn: () => adminService.fetchEventRegistrations(slug as string),
    enabled: Boolean(slug)
  });
}

export function useEventCharacters(slug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: slug ? queryKeys.eventCharacters(slug) : ["eventCharacters", "none"],
    queryFn: () => adminService.fetchEventCharacters(slug as string),
    enabled: Boolean(slug) && enabled
  });
}

// Registration counts and characters both change with any registration edit.
function invalidateEvent(queryClient: ReturnType<typeof useQueryClient>, slug: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.events });
  queryClient.invalidateQueries({ queryKey: queryKeys.event(slug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.eventRegistrations(slug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.eventCharacters(slug) });
  queryClient.invalidateQueries({ queryKey: queryKeys.eventLogs });
}

export function useUpdateEvent(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EventUpdate) => adminService.updateEvent(slug, payload),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}

export function useCreateEventRegistration(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EventRegistrationCreate) =>
      adminService.createEventRegistration(slug, payload),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}

export function useUpdateEventRegistration(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: EventRegistrationUpdate }) =>
      adminService.updateEventRegistration(slug, id, data),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}

export function useDeleteEventRegistration(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => adminService.deleteEventRegistration(slug, id),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}

// A new character isn't assigned yet, so only the character list changes.
export function useCreateEventCharacter(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EventCharacterCreate) => adminService.createEventCharacter(slug, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.eventCharacters(slug) })
  });
}

// CSV upload: creates each character in turn (duplicates are skipped) and
// refetches once at the end.
export function useCreateEventCharacters(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: EventCharacterCreate[]) => {
      let added = 0;
      for (const entry of entries) {
        try {
          await adminService.createEventCharacter(slug, entry);
          added += 1;
        } catch {
          // already exists
        }
      }
      return { added, skipped: entries.length - added };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.eventCharacters(slug) })
  });
}

export function useDeleteEventCharacter(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => adminService.deleteEventCharacter(slug, id),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}

export function useAssignEventCharacter(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ characterId, registrationId }: { characterId: UUID; registrationId: UUID }) =>
      adminService.assignEventCharacter(slug, characterId, registrationId),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}

export function useUnassignEventCharacter(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (characterId: UUID) => adminService.unassignEventCharacter(slug, characterId),
    onSuccess: () => invalidateEvent(queryClient, slug)
  });
}
