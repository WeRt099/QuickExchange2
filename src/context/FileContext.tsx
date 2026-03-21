import React, { createContext, useContext, useState } from "react";

type FileInfo = {
  uri: string;
  name: string;
  size: number;
} | null;

type FileContextType = {
  file: FileInfo;
  setFile: (file: FileInfo) => void;

  progress: number;
  setProgress: (value: number) => void;

  channelId: string | null;
  setChannelId: (id: string | null) => void;

  connected: boolean;
  setConnected: (value: boolean) => void;
};

const FileContext = createContext<FileContextType | null>(null);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<FileInfo>(null);
  const [progress, setProgress] = useState(0);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  return (
    <FileContext.Provider
      value={{
        file,
        setFile,
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
