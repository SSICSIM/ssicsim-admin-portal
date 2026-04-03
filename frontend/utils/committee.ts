import type { CharacterOut, DelegateOut } from "@/types/api";

export function filterCharactersByCommittee(
  characters: CharacterOut[],
  committeeId: string | undefined
): CharacterOut[] {
  if (!committeeId) return [];
  return characters.filter((character) => character.committee_id === committeeId);
}

export function buildDelegateMap(delegates: DelegateOut[]): Map<string, DelegateOut> {
  return new Map(delegates.map((delegate) => [delegate.id, delegate]));
}
