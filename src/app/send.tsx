import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import QRCodeView from "../components/QRCodeView";
import { useFile } from "../context/FileContext";
import { connect, getSocket } from "../services/websocket";
import { FileReceiver } from "../transfer/receiveFile";
import { prepareFileChunks } from "../transfer/sendFile";
import { generateChannelId } from "../utils/generateChannelId";

export default function Send() {
  const { file } = useFile();
  const [channelId, setChannelId] = useState("");

  useEffect(() => {
    const id = generateChannelId();
    setChannelId(id);

    const ws = connect(id);

    return () => ws.close();
  }, []);

  if (!file) {
    return (
      <View>
        <Text>No file selected</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        marginTop: 100,
      }}
    >
      <Text style={{ fontSize: 22 }}>Send File</Text>

      <Text style={{ marginTop: 20 }}>{file.name}</Text>

      {channelId && <QRCodeView value={channelId} />}

      <Text style={{ marginTop: 20 }}>Channel: {channelId}</Text>

      <Text style={{ marginTop: 10 }}>Waiting for receiver...</Text>

      <View style={{ marginTop: 30 }}>
        <Button
          title="Test full transfer"
          onPress={async () => {
            if (!file) return;

            // 1. "отправка"
            const result = await prepareFileChunks(file.uri);

            // 2. "приемник"
            const receiver = new FileReceiver();
            receiver.setFileInfo(file.name);

            // 3. передаем чанки (как будто по сети)
            result.chunks.forEach((chunk, index) => {
              receiver.addChunk(index, chunk);
            });

            // 4. сохраняем
            const savedPath = await receiver.saveFile();

            console.log("Saved to:", savedPath);
          }}
        />
      </View>
      <Button
        title="Send test message"
        onPress={() => {
          const ws = getSocket();
          ws?.send(JSON.stringify({ type: "test", message: "hello" }));
        }}
      />
    </View>
  );
}
