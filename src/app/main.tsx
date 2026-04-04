import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function MainPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER: Текст и Настройки */}
      <View style={styles.header}>
        <Text style={styles.mainText}>{t("Main page")}</Text>
        {/* Замени "Главная" на {t("Main page")} если юзаешь перевод */}

        <TouchableOpacity
          style={styles.settingsTouch}
          onPress={() => router.push("/settings")}
        >
          <Image
            source={require("../assets/images/Settings.png")}
            style={styles.iconSettings}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* CENTER: Тот самый котик */}
      <View style={styles.catContainer}>
        <Image
          source={require("../assets/images/mainCat.png")}
          style={styles.catImage}
          resizeMode="contain"
        />
      </View>

      {/* FOOTER: Кнопки */}
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/add-file")}
        >
          <Text style={styles.buttonText}>{t("Send")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/receive")}
        >
          <Text style={styles.buttonText}>{t("Receive")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0C11", // Фирменный черный
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: height * 0.2,
    marginLeft: width * 0.08,
    marginRight: width * 0.03,
  },
  mainText: {
    fontSize: width * 0.07,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  imageSettings: {
    width: width * 0.075,
    height: width * 0.075,
    marginBottom: height * 0.005,
  },
  settingsTouch: {
    width: width * 0.2,
    height: width * 0.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.02,
  },
  iconSettings: {
    width: width * 0.075,
    height: width * 0.075,
  },
  catContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  catImage: {
    width: "100%",
    height: "100%",
  },
  buttonWrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: height * 0.04,
  },
  actionButton: {
    width: width * 0.4,
    height: height * 0.065,
    borderRadius: width * 0.04,
    borderWidth: width * 0.005,
    borderColor: "#302F34",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: width * 0.055,
    fontFamily: "Raleway",
  },
});
