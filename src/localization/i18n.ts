import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../localization/en.json";
import ru from "../localization/ru.json";

const LANGUAGE_KEY = "selectedLanguage";

const resources = {
  en: { translation: en },
  ru: { translation: ru },
};

const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    return savedLanguage || "en";
  } catch (error) {
    console.warn("Ошибка загрузки языка:", error);
    return "en";
  }
};

const saveLanguage = async (language: string) => {
  // Убрали : string
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.warn("Ошибка сохранения языка:", error);
  }
};

// Асинхронная инициализация
loadSavedLanguage().then((language) => {
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
});

export const changeLanguage = (language: string) => {
  // Убрали : string
  i18n.changeLanguage(language);
  saveLanguage(language);
};

export default i18n;
