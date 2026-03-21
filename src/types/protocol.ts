export type Message = FileMetaMessage | ChunkMessage | CompleteMessage;

export interface FileMetaMessage {
  type: "file-meta";
  name: string;
  size: number;
}

export interface ChunkMessage {
  type: "chunk";
  index: number;
  data: string;
}

export interface CompleteMessage {
  type: "complete";
}
