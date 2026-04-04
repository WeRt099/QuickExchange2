import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { lookup } from "react-native-mime-types";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { connect, getSocket } from "../services/websocket";
import { generateChannelId } from "../utils/generateChannelId";

const SAF = FileSystem.StorageAccessFramework;

// Удаляем SAF, теперь используем FileSystem.Directory и FileSystem.File
const home = require("../assets/images/Home.png");
const cameraIcon = require("../assets/images/Camera.png");
const qrIcon = require("../assets/images/QR-code.png");
const folderIcon = require("../assets/images/Image.png");
const loading = require("../assets/images/Loading.png");

const { width, height } = Dimensions.get("window");
const DIRECTORY_URI_KEY = "saved_directory_uri";

const getMimeType = (fileName: string): string => {
  const mimeType = lookup(fileName);
  return mimeType || "application/octet-stream";
};

export default function Receive() {
  const router = useRouter();
  const { t } = useTranslation();

  const [mode, setMode] = useState<"camera" | "qr">("qr");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [storagePermission, setStoragePermission] = useState<any>(null);
  const [channelId, setChannelId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fileMap = useRef<{
    [fileId: string]: {
      chunks: string[]; // или Uint8Array, но лучше string (base64)
      totalChunks: number;
      fileName: string; // 🔥 ДОБАВИЛИ
    };
  }>({});
  const tunnelTimer = useRef<any>(null);

  const [notificationMessage, setNotificationMessage] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const isProcessingMessage = useRef(false);
  const storageRef = useRef<string | null>(null);

  // --- ИНИЦИАЛИЗАЦИЯ ПАПКИ ---
  useEffect(() => {
    const initStorage = async () => {
      try {
        const savedUri = await AsyncStorage.getItem(DIRECTORY_URI_KEY);
        if (savedUri) {
          setStoragePermission({ granted: true, directoryUri: savedUri });
          storageRef.current = savedUri;
          console.log("✅ Папка загружена из памяти:", savedUri);
        } else {
          setTimeout(async () => {
            const granted = await requestStoragePermission();
            if (!granted) router.replace("/main");
          }, 500);
        }
      } catch (err) {
        router.replace("/main");
      }
    };
    initStorage();
  }, []);

  // --- ИНИЦИАЛИЗАЦИЯ QR РЕЖИМА ---
  useEffect(() => {
    if (mode === "qr" && !channelId) {
      const id = generateChannelId();
      setChannelId(id);
      startReceivingProcess(id); // Сразу слушаем свой канал
    }
  }, [mode]);

  // --- ЗАПРОС КАМЕРЫ ---
  useEffect(() => {
    if (mode === "camera" && !permission?.granted) {
      requestPermission();
    }
  }, [mode, permission]);

  // --- УПРАВЛЕНИЕ ПАПКОЙ ---
  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS !== "android" || !SAF) {
        console.warn("SAF не поддерживается");
        return false;
      }

      // Обращаемся напрямую к нашей константе
      const permissions = await SAF.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        setStoragePermission(permissions);
        storageRef.current = permissions.directoryUri; // 🔥 ВАЖНО
        await AsyncStorage.setItem(DIRECTORY_URI_KEY, permissions.directoryUri);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("Ошибка SAF:", error);
      return false;
    }
  };

  const handleChangeSaveFolder = async () => {
    try {
      const currentUri = storagePermission?.directoryUri;
      const newPermissions = await SAF.requestDirectoryPermissionsAsync();

      if (
        newPermissions.granted &&
        newPermissions.directoryUri !== currentUri
      ) {
        await AsyncStorage.setItem(
          DIRECTORY_URI_KEY,
          newPermissions.directoryUri,
        );
        storageRef.current = newPermissions.directoryUri;
        showNotificationWithMessage(t("Save folder updated!"));
      }
    } catch (error) {
      console.error("Ошибка смены папки:", error);
    }
  };

  // --- АНИМАЦИИ ---
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    if (isLoading) spin.start();
    else {
      spin.stop();
      spinValue.setValue(0);
    }
    return () => spin.stop();
  }, [isLoading]);

  const spinAnimation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const showNotificationWithMessage = useCallback(
    (message: string) => {
      if (!isProcessingMessage.current && !showNotification) {
        isProcessingMessage.current = true;
        setNotificationMessage(message);
        setShowNotification(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowNotification(false);
            isProcessingMessage.current = false;
          });
        }, 3000);
      }
    },
    [showNotification, slideAnim],
  );

  // --- ЛОГИКА СКАЧИВАНИЯ (WEBSOCKET) ---
  const startReceivingProcess = (targetChannelId: string) => {
    const ws = connect(targetChannelId);

    ws.onopen = () => {
      console.log("✅ [RECEIVER] Подключен к каналу:", targetChannelId);

      // 🔥 ИСПРАВЛЕНИЕ 1: Даем серверу долю секунды, чтобы прописать нас в комнате
      setTimeout(() => {
        console.log("📤 [RECEIVER] Отправляем сигнал готовности");
        ws.send(JSON.stringify({ type: "READY" })); // Отправляем в формате JSON!
      }, 500);

      tunnelTimer.current = setTimeout(
        () => {
          ws.close();
          router.replace("/main");
        },
        5 * 60 * 1000,
      );
    };

    ws.onmessage = async (event) => {
      try {
        const raw = event.data;
        if (typeof raw !== "string") return;

        // 🔥 ИСПРАВЛЕНИЕ 2: Игнорируем технические сообщения, чтобы JSON.parse не крашился
        if (raw.includes("READY") || raw === "READY_TO_RECEIVE") {
          return;
        }

        const data = JSON.parse(raw);

        // =========================
        // 📦 START
        // =========================
        if (data.type === "START") {
          if (tunnelTimer.current) clearTimeout(tunnelTimer.current);
          setIsLoading(true);

          fileMap.current[data.fileId] = {
            chunks: [],
            totalChunks: data.totalChunks,
            fileName: data.fileName,
          };
          console.log(
            `📥 START: ${data.fileName} (${data.totalChunks} чанков)`,
          );
        }

        // =========================
        // 📦 CHUNK
        // =========================
        if (data.type === "CHUNK") {
          const fileEntry = fileMap.current[data.fileId];
          if (!fileEntry) return;

          fileEntry.chunks[data.index] = data.data;
          console.log(
            `📦 CHUNK received: ${data.fileId} [${data.index}/${fileEntry.totalChunks}]`,
          );
        }

        // =========================
        // 📦 COMPLETE
        // =========================
        if (data.type === "COMPLETE") {
          console.log("📦 COMPLETE:", data.fileId);
          const fileEntry = fileMap.current[data.fileId];
          if (!fileEntry) return;

          const isComplete = fileEntry.chunks.length === fileEntry.totalChunks;
          if (!isComplete) return;

          console.log(`💾 Сохраняем файл: ${fileEntry.fileName}`);
          const dir = storageRef.current;
          if (!dir) return;

          const fullBase64 = fileEntry.chunks.join("");
          const sanitizedFileName = fileEntry.fileName.replace(
            /[\/:*?"<>|]/g,
            "_",
          );
          const mimeType = getMimeType(fileEntry.fileName);

          const newFileUri = await SAF.createFileAsync(
            dir,
            sanitizedFileName,
            mimeType,
          );
          await FileSystem.writeAsStringAsync(newFileUri, fullBase64, {
            encoding: "base64" as any,
          });

          delete fileMap.current[data.fileId];

          if (Object.keys(fileMap.current).length === 0) {
            setIsLoading(false);
            showNotificationWithMessage(
              t("All files downloaded successfully!"),
            );
            setTimeout(() => {
              router.replace("/main");
            }, 2000);
          }
        }
      } catch (err) {
        console.log("❌ parse error:", err);
      }
    };

    ws.onerror = (error) => {
      console.log("❌ WS Ошибка:", error);
      setIsLoading(false);
      showNotificationWithMessage(t("Failed to connect to server"));
    };
  };

  // --- ЛОГИКА КАМЕРЫ (СКАНИРОВАНИЕ) ---
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || isLoading) return;

    if (!data.startsWith("quickexchange://")) {
      console.log("❌ Чужой QR:", data);
      setScanned(true);
      showNotificationWithMessage(t("Invalid QR code format"));
      setTimeout(() => setScanned(false), 2500);
      return;
    }

    if (data.startsWith("quickexchange://receive/")) {
      console.log("⚠️ Receive -> Receive заблокировано");
      setScanned(true);
      showNotificationWithMessage(t("Cannot scan another receiver"));
      setTimeout(() => setScanned(false), 2500);
      return;
    }

    setScanned(true);
    const scannedChannelId =
      data.split("/").pop() || data.replace("quickexchange://", "");
    console.log("📷 Валидный QR отправителя:", scannedChannelId);
    startReceivingProcess(scannedChannelId);
  };

  const qrValueString = channelId ? `quickexchange://receive/${channelId}` : "";

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔔 Уведомления */}
      {showNotification && (
        <Animated.View
          style={[
            styles.notificationContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      {/* 🔄 Модалка загрузки */}
      <Modal animationType="fade" transparent={true} visible={isLoading}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{t("Downloading in progress")}</Text>
            <Text style={styles.fileNameText}>
              {t("Please wait until the file transfer is complete")}
            </Text>
            <Animated.Image
              source={loading}
              style={[
                styles.loadingImage,
                { transform: [{ rotate: spinAnimation }] },
              ]}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>

      {/* 🔝 Шапка */}
      <View style={styles.mainContainer}>
        <Text style={styles.mainText}>{t("Receive page")}</Text>
        <TouchableOpacity
          style={styles.imageHomeContainer}
          disabled={isLoading}
          onPress={() => {
            getSocket()?.close();
            router.replace("/main");
          }}
        >
          <Image source={home} style={styles.imageHome} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* 🖼 Контент (Камера ИЛИ QR) */}
      <View style={styles.contentArea}>
        {mode === "camera" ? (
          <>
            <View style={styles.scanAreaWrapper}>
              {!permission?.granted ? (
                <Text style={styles.scanText}>
                  {t("Need camera permission")}
                </Text>
              ) : (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
              )}
            </View>
            <View style={styles.scanTextContainer}>
              <Text style={styles.scanText}>
                {t("Point the camera at Sender")}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.qrAreaWrapper}>
              {channelId ? (
                <QRCode
                  value={qrValueString}
                  size={width * 0.7}
                  color="white"
                  backgroundColor="#0D0C11"
                />
              ) : (
                <Text style={styles.scanText}>{t("Generating QR...")}</Text>
              )}
            </View>
            <View style={styles.scanTextContainer}>
              <Text style={styles.scanText}>
                {t("Let the sender scan this QR")}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 🎛 Панель вкладок (Камера, QR, Выбор папки) */}
      <View style={styles.containerButton}>
        <View style={styles.containerSelect}>
          <TouchableOpacity
            style={styles.button}
            disabled={isLoading}
            onPress={() => setMode("qr")}
          >
            <Image
              source={qrIcon}
              style={[styles.image, mode !== "qr" && {}]}
              resizeMode="contain"
            />
          </TouchableOpacity>
          {mode === "qr" && <View style={styles.line} />}
        </View>

        <View style={styles.containerSelect}>
          <TouchableOpacity
            style={styles.button}
            disabled={isLoading}
            onPress={() => {
              setMode("camera");
              setScanned(false);
            }}
          >
            <Image
              source={cameraIcon}
              style={[styles.image, mode !== "camera" && {}]}
              resizeMode="contain"
            />
          </TouchableOpacity>
          {mode === "camera" && <View style={styles.line} />}
        </View>

        <View style={styles.containerSelect}>
          <TouchableOpacity
            style={styles.button}
            disabled={isLoading}
            onPress={handleChangeSaveFolder}
          >
            <Image
              source={folderIcon}
              style={styles.image}
              resizeMode="contain"
            />
          </TouchableOpacity>
          {/* У кнопки папки нет линии (индикатора), так как это действие, а не режим */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0C11" },
  mainContainer: {
    flexDirection: "row",
    marginLeft: width * 0.08,
    marginRight: width * 0.03,
    marginTop: height * 0.005,
    marginBottom: height * 0.08, // Вернул старый отступ, т.к. тут нет списка файлов
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainText: { fontSize: width * 0.07, color: "#ffffff", fontFamily: "Raleway" },
  imageHomeContainer: {
    width: width * 0.2,
    height: width * 0.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.01,
  },
  imageHome: { width: width * 0.075, height: width * 0.075 },
  contentArea: { flex: 1, alignItems: "center" },
  scanAreaWrapper: {
    height: width * 0.83,
    width: width * 0.83,
    borderRadius: width * 0.05,
    overflow: "hidden",
    marginBottom: height * 0.04,
    borderColor: "#ffffff",
    borderWidth: width * 0.005,
    justifyContent: "center",
    alignItems: "center",
  },
  qrAreaWrapper: {
    justifyContent: "center",
    alignItems: "center",
    height: width * 0.83,
    width: width * 0.83,
    backgroundColor: "#0D0C11",
    borderColor: "#ffffff",
    borderWidth: width * 0.005,
    borderRadius: width * 0.05,
    marginBottom: height * 0.04,
  },
  camera: { flex: 1, width: "100%", height: "100%" },
  scanTextContainer: { alignItems: "center" },
  scanText: {
    fontFamily: "Raleway",
    fontSize: width * 0.06,
    color: "#ffffff",
    textAlign: "center",
  },
  containerButton: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: height * 0.08,
    width: "100%",
  },
  containerSelect: {
    flexDirection: "column",
    alignItems: "center",
    marginHorizontal: width * 0.04,
  },
  line: {
    width: width * 0.17,
    height: 2,
    backgroundColor: "#ffffff",
    marginTop: height * 0.01,
  },
  button: {
    width: width * 0.17,
    height: width * 0.17,
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: "100%", height: "100%" },
  notificationContainer: {
    position: "absolute",
    width: width * 0.9,
    height: height * 0.065,
    alignSelf: "center",
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.06,
    backgroundColor: "#242329",
    borderColor: "#302F34",
    borderWidth: width * 0.003,
    borderRadius: width * 0.03,
  },
  notificationText: {
    fontSize: width * 0.04,
    color: "#ffffff",
    fontFamily: "Raleway",
    textAlign: "center",
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: "#0D0C11",
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.03,
    borderRadius: 15,
    alignItems: "center",
    borderColor: "#242329",
    borderWidth: width * 0.005,
  },
  modalText: {
    fontSize: width * 0.05,
    marginBottom: height * 0.01,
    fontFamily: "Raleway",
    color: "#fff",
  },
  fileNameText: {
    fontSize: width * 0.04,
    marginBottom: height * 0.03,
    textAlign: "center",
    fontFamily: "Raleway",
    color: "#C0C0C0",
  },
  loadingImage: { width: width * 0.15, height: width * 0.15 },
});
