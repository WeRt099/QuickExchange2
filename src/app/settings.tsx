import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import i18n, { changeLanguage } from "../localization//i18n";

const { width, height } = Dimensions.get("window");

const languages = [
  { label: "English", value: "en" },
  { label: "Русский", value: "ru" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [language, setLanguage] = useState(languages[0].value); // Начальное значение

  // Загружаем сохранённый язык при монтировании
  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = await i18n.language; // Получаем текущий язык из i18n
      setLanguage(savedLanguage);
    };
    loadLanguage();
  }, []);

  // Синхронизируем смена языка
  const handleLanguageChange = (item: { value: string; label: string }) => {
    setLanguage(item.value);
    changeLanguage(item.value); // Сохраняем и меняем язык
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("Settings")}</Text>
        <TouchableOpacity
          style={styles.homeTouch}
          onPress={() => router.replace("/main")}
        >
          <Image
            source={require("../assets/images/Home.png")}
            style={styles.homeIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* КОНТЕЙНЕР НАСТРОЕК */}
      <View style={styles.settingsContent}>
        {/* Строка выбора языка */}
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t("Language")}</Text>
          <View style={styles.dynamicLine} />
          <Dropdown
            style={styles.dropdown}
            data={languages}
            labelField="label"
            valueField="value"
            value={language}
            onChange={handleLanguageChange}
            selectedTextStyle={styles.dropdownSelectedText}
            containerStyle={styles.dropdownListContainer}
            itemTextStyle={styles.dropdownItemText}
            activeColor="transparent"
            iconStyle={{ width: 0, height: 0 }}
            renderItem={(item) => (
              <Text
                style={[
                  styles.dropdownItemText,
                  item.value === language && styles.itemActive,
                ]}
              >
                {item.label}
              </Text>
            )}
          />
        </View>

        {/* Обратная связь */}
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t("Feedback")}</Text>
          <View style={styles.dynamicLine} />
          <TouchableOpacity
            onPress={() => Linking.openURL("https://t.me/your_bot")}
          >
            <Text style={styles.linkText}>Telegram</Text>
          </TouchableOpacity>
        </View>

        {/* Разработчик */}
        <View style={styles.settingRow}>
          <Text style={styles.rowLabel}>{t("Developer")}</Text>
          <View style={styles.dynamicLine} />
          <TouchableOpacity
            onPress={() => Linking.openURL("https://github.com/your_profile")}
          >
            <Text style={styles.linkText}>GitHub</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* КОТИК ВНИЗУ */}
      <View style={styles.catFooter}>
        <Image
          source={require("../assets/images/settingsCat.png")}
          style={styles.catImage}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0C11",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: height * 0.005,
    marginBottom: height * 0.05,
    marginLeft: width * 0.08,
    marginRight: width * 0.03,
  },
  headerTitle: {
    fontSize: width * 0.07,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  homeTouch: {
    width: width * 0.2,
    height: width * 0.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.01,
  },
  homeIcon: {
    width: width * 0.075,
    height: width * 0.075,
  },
  settingsContent: {
    marginHorizontal: width * 0.08,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: height * 0.025,
  },
  rowLabel: {
    fontSize: width * 0.05,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  dynamicLine: {
    flex: 1, // Линия теперь тянется, заполняя всё пустое место
    height: 1,
    backgroundColor: "#ffffff",
    marginHorizontal: width * 0.04,
  },
  linkText: {
    fontSize: width * 0.05,
    color: "#ffffff",
    textDecorationLine: "underline",
    fontFamily: "Raleway",
  },
  dropdown: {
    width: width * 0.27,
    borderRadius: width * 0.02,
    backgroundColor: "#0D0C11",
  },
  dropdownSelectedText: {
    color: "#ffffff",
    fontSize: width * 0.045,
    borderWidth: width * 0.003,
    fontFamily: "Raleway",
    borderRadius: width * 0.02,
    borderColor: "#ffffff",
    textAlign: "center",
    paddingVertical: height * 0.01,
  },
  dropdownListContainer: {
    marginTop: height * 0.003,
    backgroundColor: "#0D0C11",
    borderWidth: width * 0.003,
    borderRadius: width * 0.02,
    height: height * 0.13,
  },
  dropdownItemText: {
    color: "#ffffff",
    textAlign: "center",
    fontFamily: "Raleway",
    fontSize: width * 0.045,
    marginTop: height * 0.02,
  },
  itemActive: {
    color: "#2E2D32",
    fontFamily: "Raleway",
    textAlign: "center",
    fontSize: width * 0.045,
    marginTop: height * 0.02,
  },
  catFooter: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: height * 0.02,
  },
  catImage: {
    height: height * 0.58,
  },
});
