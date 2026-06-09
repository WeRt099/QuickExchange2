import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import * as FileSystem from "expo-file-system"; // Убедись, что импортирован
import { useFile } from "../context/FileContext";
import { connect, getSocket } from "../services/websocket";
import { generateChannelId } from "../utils/generateChannelId";

const home = require("../assets/images/Home.png");
const cameraIcon = require("../assets/images/Camera.png");
const qrIcon = require("../assets/images/QR-code.png");
const loading = require("../assets/images/Loading.png");

const { width, height } = Dimensions.get("window");

export default function Send() {
  const router = useRouter();
  const { t } = useTranslation();
  const { files, clearFiles } = useFile();

  const [mode, setMode] = useState<"camera" | "qr">("camera");

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const [channelId, setChannelId] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [notificationMessage, setNotificationMessage] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // 🔥 ДОБАВЛЕНО: Реф для хранения таймера
  const tunnelTimer = useRef<any>(null);

  // --- ЛОГИРОВАНИЕ ФАЙЛОВ ---
  useEffect(() => {
    console.log(
      `🔄 Режим изменен на: ${mode}. Текущие файлы в очереди (${files.length}):`,
      files.map((f) => f.name),
    );
  }, [mode, files]);

  // --- Инициализация QR режима ---
  useEffect(() => {
    if (mode === "qr" && !channelId) {
      const id = generateChannelId();
      setChannelId(id);
      setupReceiverWebSocket(id);
    }

    // 🔥 ДОБАВЛЕНО: Очистка таймера при смене режима (если ушли с QR)
    if (mode === "camera") {
      clearTunnelTimer();
    }
  }, [mode]);

  // 🔥 ДОБАВЛЕНО: Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      clearTunnelTimer();
    };
  }, []);

  const clearTunnelTimer = () => {
    if (tunnelTimer.current) {
      clearTimeout(tunnelTimer.current);
      tunnelTimer.current = null;
    }
  };

  // --- Запрос прав камеры ---
  useEffect(() => {
    if (mode === "camera" && !permission?.granted) {
      requestPermission();
    }
  }, [mode, permission]);

  // --- Анимация загрузки ---
  // ... (без изменений) ...
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    if (isSending) spin.start();
    else {
      spin.stop();
      spinValue.setValue(0);
    }
    return () => spin.stop();
  }, [isSending]);

  const spinAnimation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // --- Уведомления ---
  // ... (без изменений) ...
  const showNotificationWithMessage = useCallback(
    (message: string) => {
      if (!showNotification) {
        setNotificationMessage(message);
        setShowNotification(true);
        Animated.timing(slideAnim, {
          toValue: 60,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setShowNotification(false));
        }, 3000);
      }
    },
    [showNotification, slideAnim],
  );

  // --- Отправка файлов по сети ---
  // --- Отправка файлов по сети ---
  const startSendingProcess = async (
    targetChannelId: string,
    existingWs?: any,
  ) => {
    if (files.length === 0) {
      showNotificationWithMessage(t("No files selected"));
      return;
    }

    clearTunnelTimer();
    setIsSending(true);

    const ws = existingWs || connect(targetChannelId);

    // 🔥 Настройки скользящего окна
    const WINDOW_SIZE = 4; // Сколько чанков можем отправить вперед без подтверждения
    let lastAckedIndex = -1; // Индекс последнего успешно подтвержденного чанка
    let resolveWindowSlot: (() => void) | null = null;

    // Ловим подтверждения (ACK) от получателя
    ws.onmessage = (event: any) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "ACK") {
          // Обновляем максимальный подтвержденный индекс
          lastAckedIndex = Math.max(lastAckedIndex, message.index);

          // Если цикл стоял на паузе и ждал свободного места в окне — пинаем его
          if (resolveWindowSlot) {
            resolveWindowSlot();
          }
        }
      } catch (err) {
        console.log("📨 [SEND] Ошибка парсинга сообщения:", event.data);
      }
    };

    const executeSend = async () => {
      console.log("✅ Готовы к отправке в канал:", targetChannelId);
      try {
        for (const file of files) {
          // Сбрасываем индекс подтверждений для КАЖДОГО файла
          lastAckedIndex = -1;

          console.log(`📤 Начинаем отправку файла: ${file.name}`);
          const fileId = `${file.name}-${Date.now()}`;

          // 1. Получаем инфу о файле (размер) без загрузки в память
          const fileInfo = await FileSystem.getInfoAsync(file.uri);
          if (!fileInfo.exists) {
            console.log(`❌ Файл не найден: ${file.name}`);
            continue;
          }

          const CHUNK_SIZE = 524286; // 512 КБ
          const totalChunks = Math.ceil(fileInfo.size / CHUNK_SIZE);

          const fileIndex = files.indexOf(file) + 1;
          const totalFiles = files.length;

          ws.send(
            JSON.stringify({
              type: "START",
              fileId,
              fileName: file.name,
              totalChunks,
              fileIndex,
              totalFiles,
            }),
          );

          // 2. Пошагово читаем с диска и отправляем чанки
          for (let index = 0; index < totalChunks; index++) {
            if (ws.readyState !== 1) {
              throw new Error("WebSocket connection lost during transfer");
            }

            // Ждем освобождения скользящего окна
            while (index - lastAckedIndex > WINDOW_SIZE) {
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(
                    new Error(
                      `Timeout waiting for window slide at chunk ${index}. Last ACK: ${lastAckedIndex}`,
                    ),
                  );
                }, 15000);

                resolveWindowSlot = () => {
                  clearTimeout(timeout);
                  resolve();
                };
              });
            }

            // Вычисляем позицию текущего куска
            const position = index * CHUNK_SIZE;
            const length = Math.min(CHUNK_SIZE, fileInfo.size - position);

            // Читаем только ОДИН чанк прямо с диска
            const chunkData = await FileSystem.readAsStringAsync(file.uri, {
              encoding: FileSystem.EncodingType.Base64,
              position: position,
              length: length,
            });

            ws.send(
              JSON.stringify({
                type: "CHUNK",
                fileId,
                index,
                data: chunkData,
              }),
            );

            // Микропауза для разгрузки UI-потока
            if (index % 2 === 0) {
              await new Promise((r) => setTimeout(r, 1));
            }
          }

          // Ждем финального ACK для текущего файла
          while (lastAckedIndex < totalChunks - 1) {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error("Timeout waiting for final ACKs")),
                10000,
              );
              resolveWindowSlot = () => {
                clearTimeout(timeout);
                resolve();
              };
            });
          }

          ws.send(JSON.stringify({ type: "COMPLETE", fileId }));
        }

        // Завершение всей очереди
        showNotificationWithMessage(t("Files sent successfully!"));
        setTimeout(() => {
          clearFiles();
          router.replace("/main");
        }, 2000);
      } catch (error) {
        console.log("❌ Ошибка при отправке:", error);
        showNotificationWithMessage(t("Error sending files"));
      } finally {
        setIsSending(false);
      }
    };

    if (ws.readyState === 1) {
      executeSend();
    } else {
      ws.onopen = executeSend;
    }

    ws.onerror = () => {
      showNotificationWithMessage(t("Failed to connect to server"));
      setIsSending(false);
    };
  };
  // --- Логика сканирования камеры ---
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || isSending) return;

    if (!data.startsWith("quickexchange://")) {
      console.log("❌ Проигнорирован чужой QR:", data);
      setScanned(true);
      showNotificationWithMessage(t("Invalid QR code URL"));
      setTimeout(() => setScanned(false), 2500);
      return;
    }

    if (data.startsWith("quickexchange://send/")) {
      console.log("⚠️ Попытка Send -> Send заблокирована");
      setScanned(true);
      showNotificationWithMessage(t("Cannot send to another sender"));
      setTimeout(() => setScanned(false), 2500);
      return;
    }

    setScanned(true);
    console.log("📷 Валидный QR Сканирован:", data);

    const scannedChannelId =
      data.split("/").pop() || data.replace("quickexchange://", "");
    startSendingProcess(scannedChannelId);
  };

  // --- Логика ожидания (QR режим) ---
  const setupReceiverWebSocket = (id: string) => {
    const ws = connect(id);

    ws.onopen = () => {
      console.log("✅ Ждем получателя на канале:", id);

      // 🔥 ДОБАВЛЕНО: Устанавливаем таймер на 5 минут при успешном открытии соединения
      tunnelTimer.current = setTimeout(
        () => {
          console.log("⏱️ Таймаут ожидания: закрываем соединение");
          clearFiles();
          ws.close();
          router.replace("/main");
        },
        5 * 60 * 1000,
      );
    };

    ws.onmessage = (event) => {
      console.log("📨 [SEND] Получено сообщение:", event.data);

      if (typeof event.data === "string" && event.data.includes("READY")) {
        console.log("📩 Получен сигнал готовности от получателя!");
        startSendingProcess(id, ws);
      }
    };
  };

  const qrValueString = channelId ? `quickexchange://send/${channelId}` : "";

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔔 Notification */}
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

      {/* 🔄 Loading Modal */}
      <Modal animationType="fade" transparent={true} visible={isSending}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{t("Sending in progress")}</Text>
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

      {/* 🔝 Header */}
      <View style={styles.mainContainer}>
        <Text style={styles.mainText}>{t("Sending page")}</Text>
        <TouchableOpacity
          style={styles.imageHomeContainer}
          disabled={isSending}
          onPress={() => {
            getSocket()?.close();
            clearFiles();
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
              <Text style={styles.scanText}>{t("Scan QR code")}</Text>
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
                {t("Let the receiver scan this QR")}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* 🎛 Bottom Tabs (Тумблер Камера / QR) */}
      <View style={styles.containerButton}>
        <View style={styles.containerSelect}>
          <TouchableOpacity
            style={styles.button}
            disabled={isSending}
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
            disabled={isSending}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0C11",
  },
  mainContainer: {
    flexDirection: "row",
    marginLeft: width * 0.08,
    marginRight: width * 0.03,
    marginTop: height * 0.005,
    marginBottom: height * 0.1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainText: {
    fontSize: width * 0.07,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  imageHomeContainer: {
    width: width * 0.2,
    height: width * 0.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.01,
  },
  imageHome: {
    width: width * 0.075,
    height: width * 0.075,
  },
  // ------------------------------------
  contentArea: {
    flex: 1,
    alignItems: "center",
  },
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
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scanTextContainer: {
    alignItems: "center",
  },
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
    marginHorizontal: width * 0.06,
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
  image: {
    width: "100%",
    height: "100%",
  },
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
  loadingImage: {
    width: width * 0.15,
    height: width * 0.15,
  },
});
