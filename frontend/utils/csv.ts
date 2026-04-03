import type { CharacterCreate } from "@/types/api";

export async function parseCharacterCsv(file: File, committeeId: string): Promise<CharacterCreate[]> {
  const raw = await file.text();
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const rows = lines.slice(1);

  const nameIndex = headers.indexOf("character_name");
  if (nameIndex === -1) {
    throw new Error("CSV must include a 'character_name' header.");
  }

  return rows
    .map((row) => row.split(",").map((cell) => cell.trim()))
    .map((cells) => cells[nameIndex])
    .filter((name) => Boolean(name))
    .map((name) => ({
      name,
      committee_id: committeeId,
      delegate_id: null
    }));
}
