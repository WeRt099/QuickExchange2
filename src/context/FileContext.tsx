import React, { createContext, useContext, useState } from "react";

export type FileType = {
  id: string;
  uri: string;
  name: string;
  size: number;
};

type FileContextType = {
  files: FileType[];
  setFiles: (files: FileType[]) => void;
  addFiles: (newFiles: FileType[]) => void;
  clearFiles: () => void;

  progress: number;
  setProgress: (value: number) => void;

  channelId: string | null;
  setChannelId: (id: string | null) => void;

  connected: boolean;
  setConnected: (value: boolean) => void;
};

const FileContext = createContext<FileContextType | null>(null);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<FileType[]>([]);
  const [progress, setProgress] = useState(0);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const addFiles = (newFiles: FileType[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const clearFiles = () => {
    setFiles([]);
    setProgress(0);
  };

  return (
    <FileContext.Provider
      value={{
        files,
        setFiles,
        addFiles,
        clearFiles,
        progress,
        setProgress,
        channelId,
        setChannelId,
        connected,
        setConnected,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}

export function useFile() {
  const context = useContext(FileContext);

  if (!context) {
    throw new Error("useFile must be used inside FileProvider");
  }

  return context;
}
