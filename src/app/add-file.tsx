import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FileType, useFile } from "../context/FileContext";

const { width, height } = Dimensions.get("window");

const home = require("../assets/images/Home.png");
const plus = require("../assets/images/Plus.png");
const fileIcon = require("../assets/images/File.png");
const trash = require("../assets/images/Trash.png");

const MAX_FILENAME_LENGTH = 15;

// 🔐 Permission
async function requestFilePermission() {
  if (Platform.OS === "android") {
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const hasPermission = await PermissionsAndroid.check(permission);
    if (hasPermission) return true;

    const granted = await PermissionsAndroid.request(permission);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

// 📏 формат размера
const formatSize = (size?: number) => {
  if (!size) return "Unknown";

  if (size >= 1024 ** 3) return (size / 1024 ** 3).toFixed(2) + " GB";
  if (size >= 1024 ** 2) return (size / 1024 ** 2).toFixed(2) + " MB";
  return (size / 1024).toFixed(2) + " KB";
};

// 📦 Item
const FileItem = ({
  file,
  onLongPress,
}: {
  file: FileType;
  onLongPress: () => void;
}) => {
  const truncatedName =
    file.name.length > MAX_FILENAME_LENGTH
      ? file.name.slice(0, MAX_FILENAME_LENGTH) + " ..."
      : file.name;

  return (
    <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.5}>
      <View>
        <View style={styles.fileRow}>
          <View style={styles.fileInfo}>
            <Image source={fileIcon} style={styles.fileIcon} />
            <Text style={styles.fileName}>{truncatedName}</Text>
          </View>
          <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
        </View>
        <View style={styles.line} />
      </View>
    </TouchableOpacity>
  );
};

export default function AddFilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { files, addFiles, clearFiles, setFiles } = useFile();

  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  // 📂 PICK FILES
  const pickDocument = async () => {
    const permission = await requestFilePermission();

    if (!permission) {
      setPermissionModalVisible(true);
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });

      if (result.canceled) return;

      const newFiles: FileType[] = result.assets.map((file) => ({
        id: Math.random().toString(36),
        name: file.name,
        size: file.size ?? 0,
        uri: file.uri,
      }));

      addFiles(newFiles);
    } catch (e) {
      console.log("Pick error:", e);
    }
  };

  // 🗑 DELETE
  const handleDelete = () => {
    if (!selectedFile) return;

    setFiles(files.filter((f) => f.id !== selectedFile.id));
    setDeleteModalVisible(false);
    setSelectedFile(null);
  };

  // 🚀 GO SEND
  const handleGoExchange = () => {
    if (files.length === 0) {
      setWarningModalVisible(true);
      return;
    }

    router.push("/send");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.mainContainer}>
        <Text style={styles.mainText}>{t("Sending page")}</Text>
        <TouchableOpacity
          style={styles.imageHomeContainer}
          onPress={() => {
            clearFiles();
            router.replace("/main");
          }}
        >
          <Image source={home} style={styles.imageHome} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* TITLE */}
      <View style={styles.addfileTextContainer}>
        <Text style={styles.addfileText}>{t("Add files")}</Text>
      </View>

      {/* FILE LIST */}
      <View style={styles.filesContainer}>
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileItem
              file={item}
              onLongPress={() => {
                setSelectedFile(item);
                setDeleteModalVisible(true);
              }}
            />
          )}
        />
      </View>

      {/* BUTTONS */}
      <View style={styles.containerButton}>
        <TouchableOpacity style={styles.button3} onPress={() => clearFiles()}>
          <Image source={trash} style={styles.image} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button1} onPress={handleGoExchange}>
          <Text style={styles.buttonText}>{t("Go exchange")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button2} onPress={pickDocument}>
          <Image source={plus} style={styles.image} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* DELETE MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{t("Delete file")}</Text>
            <Text style={styles.fileNameText}>{selectedFile?.name}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t("Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>{t("Delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WARNING */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={warningModalVisible}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{t("Warning")}</Text>
            <Text style={styles.fileNameText}>{t("No files to send")}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setWarningModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t("OK")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PERMISSION */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={permissionModalVisible}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{t("Permission required")}</Text>
            <Text style={styles.fileNameText}>
              {t("Storage access is required to select files")}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.deleteButtonText}>
                  {t("Open settings")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: height * 0.055,
    justifyContent: "space-between",
    alignItems: "center",
  },
  mainText: {
    fontSize: width * 0.07,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  imageHome: {
    width: width * 0.075,
    height: width * 0.075,
  },
  imageHomeContainer: {
    width: width * 0.2,
    height: width * 0.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.01,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  addfileTextContainer: {
    alignItems: "center",
    marginBottom: height * 0.04,
  },
  addfileText: {
    fontFamily: "Raleway",
    fontSize: width * 0.06,
    color: "#C0C0C0",
  },

  filesContainer: {
    flex: 1,
    marginHorizontal: width * 0.08,
    marginBottom: height * 0.16,
  },
  fileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: height * 0.015,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileIcon: {
    width: width * 0.12,
    height: width * 0.12,
    marginRight: width * 0.04,
  },
  fileName: {
    fontSize: width * 0.045,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  fileSize: {
    fontSize: width * 0.04,
    color: "#ffffff",
    fontFamily: "Raleway",
  },
  line: {
    height: 1,
    backgroundColor: "#302F34",
    width: "90%",
    alignSelf: "center",
    marginBottom: height * 0.015,
  },

  containerButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    bottom: height * 0.03,
    width: "100%",
    height: height * 0.07,
    backgroundColor: "#0D0C11",
  },
  button1: {
    width: width * 0.55,
    height: "100%",
    borderRadius: width * 0.04,
    borderWidth: width * 0.003,
    borderColor: "#302F34",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#242329",
    marginRight: width * 0.03,
    marginLeft: width * 0.03,
  },
  button2: {
    width: width * 0.15,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  button3: {
    width: width * 0.15,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: width * 0.05,
    fontFamily: "Raleway",
  },

  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: "#0D0C11",
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.02,
    borderRadius: 10,
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  cancelButton: {
    flex: 1,
    justifyContent: "center",
    height: height * 0.05,
    backgroundColor: "#0D0C11",
    alignItems: "center",
    marginRight: width * 0.04,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontFamily: "Raleway",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#0D0C11",
    height: height * 0.05,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontFamily: "Raleway",
  },
  fileNameText: {
    fontSize: width * 0.045,
    marginBottom: height * 0.02,
    textAlign: "center",
    fontFamily: "Raleway",
    color: "#C0C0C0",
  },
});
