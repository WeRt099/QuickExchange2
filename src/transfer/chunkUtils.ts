export const CHUNK_SIZE = 64 * 1024; // 64KB

export function splitIntoChunks(base64: string): string[] {
  const chunks = [];

  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }

  return chunks;
}
