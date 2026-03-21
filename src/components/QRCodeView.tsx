import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type Props = {
  value: string;
};

export default function QRCodeView({ value }: Props) {
  return (
    <View style={{ marginTop: 20 }}>
      <QRCode value={value} size={220} />
    </View>
  );
}
