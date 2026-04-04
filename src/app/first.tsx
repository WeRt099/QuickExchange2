import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";

const HelloCatScreen = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/helloCat.png")}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0C11",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width * 0.55,
    height: height * 0.55,
  },
});

export default HelloCatScreen;
