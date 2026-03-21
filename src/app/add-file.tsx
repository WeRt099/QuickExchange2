import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { Button, Text, View } from "react-native";
import { useFile } from "../context/FileContext";

export default function AddFile() {
  const { setFile } = useFile();

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];

    setFile({
      uri: file.uri,
      name: file.name,
      size: file.size ?? 0,
    });

    router.push("/send");
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Select file to send
      </Text>

      <Button title="Choose file" onPress={pickFile} />
    </View>
  );
}
