import { router } from "expo-router";
import { Button, View } from "react-native";

export default function Main() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        gap: 20,
        padding: 40,
      }}
    >
      <Button title="Send File" onPress={() => router.push("/add-file")} />

      <Button title="Receive File" onPress={() => router.push("/receive")} />

      <Button title="Settings" onPress={() => router.push("/settings")} />
    </View>
  );
}
