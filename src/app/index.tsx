import { router } from "expo-router";
import { Button, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 28, marginBottom: 20 }}>QuickExchange</Text>

      <Button title="Start" onPress={() => router.replace("/main")} />
    </View>
  );
}
