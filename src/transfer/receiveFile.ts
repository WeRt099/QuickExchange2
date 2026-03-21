import * as FileSystem from "expo-file-system/legacy";

type Chunk = {
  index: number;
  data: string;
};

export class FileReceiver {
  private chunks: Chunk[] = [];
  private fileName: string = "received_file";

  setFileInfo(name: string) {
    this.fileName = name;
  }

  addChunk(index: number, data: string) {
    this.chunks.push({ index, data });
  }

  async saveFile() {
    // 1. сортируем чанки
    const sorted = this.chunks.sort((a, b) => a.index - b.index);

    // 2. собираем base64
    const base64 = sorted.map((c) => c.data).join("");

    // 3. путь для сохранения
    const path = FileSystem.documentDirectory + this.fileName;

    // 4. сохраняем файл
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: "base64",
    });

    return path;
  }
}
