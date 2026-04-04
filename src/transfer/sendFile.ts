import * as FileSystem from "expo-file-system";
import { splitIntoChunks } from "./chunkUtils";

export async function prepareFileChunks(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const chunks = splitIntoChunks(base64);

  return {
    base64,
    chunks,
  };
}
