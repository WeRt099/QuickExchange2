import React from "react";
import { useTranslation } from "react-i18next";
import {
  BackHandler,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const image = require("../assets/images/fixCat.png");

const { width, height } = Dimensions.get("window");

export default function ErrorPage() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>QuickExchange</Text>
      <Text style={styles.message}>
        {t("Sorry, the app is not working now")}
      </Text>
      <Text style={styles.subMessage}>{t("Technical work")}</Text>
      <View>
        <Image source={image} style={styles.image} />
      </View>
      <View style={styles.containerButton}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => BackHandler.exitApp()}
        >
          <Text style={styles.buttonText}>{t("See you soon")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0C11",
    alignItems: "center",
  },
  logo: {
    marginTop: height * 0.13,
    fontSize: width * 0.09,
    color: "#fff",
    fontFamily: "Raleway",
    marginBottom: height * 0.09,
  },
  message: {
    fontSize: width * 0.05,
    color: "#fff",
    marginBottom: height * 0.015,
    fontFamily: "Raleway",
  },
  subMessage: {
    fontSize: width * 0.05,
    color: "#fff",
    marginBottom: height * 0.05,
    fontFamily: "Raleway",
  },
  image: {
    width: width * 0.7,
    height: height * 0.4,
  },
  containerButton: {
    top: height * 0.1,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#0D0C11",
  },
  button: {
    width: width * 0.55,
    height: height * 0.065,
    borderRadius: width * 0.04,
    borderWidth: width * 0.005,
    borderColor: "#302F34",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: width * 0.053,
    fontFamily: "Raleway",
  },
});
