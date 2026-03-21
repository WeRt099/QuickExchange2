import { Camera, CameraView } from "expo-camera";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function Receive() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [channelId, setChannelId] = useState("");

  useEffect(() => {
    const getPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getPermission();
  }, []);

  const handleScan = ({ data }: { data: string }) => {
    setScanned(true);
    setChannelId(data);
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      {!scanned ? (
        <CameraView
          style={{ flex: 1 }}
          onBarcodeScanned={handleScan}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>Connected to channel:</Text>
          <Text style={{ fontSize: 20 }}>{channelId}</Text>
        </View>
      )}
    </View>
  );
}
