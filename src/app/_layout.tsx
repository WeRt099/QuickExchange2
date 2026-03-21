import { Stack } from "expo-router";
import { FileProvider } from "../context/FileContext";

export default function Layout() {
  return (
    <FileProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </FileProvider>
  );
}
