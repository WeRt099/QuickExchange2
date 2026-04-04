class WebSocketService {
  private socket: WebSocket | null = null;

  connect(url: string) {
    console.log("--- WS ATTEMPT ---");
    console.log("URL:", url);

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log("✅ [WS] Connected to:", url);
      };

      this.socket.onmessage = (event) => {
        console.log("📩 [WS] Message received:", event.data);
        // Тут можно добавить callback
      };

      this.socket.onerror = (e: any) => {
        // В RN 'e' обычно пустой, но мы вытащим максимум
        console.log("❌ [WS] ERROR EVENT:", JSON.stringify(e));
        console.log("❌ [WS] Message:", e.message);
      };

      this.socket.onclose = (e) => {
        console.log("🔌 [WS] Closed. Code:", e.code, "Reason:", e.reason);
        // Код 1006 — самая частая проблема (обрыв без причины, обычно SSL)
      };
    } catch (err) {
      console.log("🚫 [WS] Critical exception:", err);
    }
  }

  send(data: any) {
    if (!this.socket) return;

    this.socket.send(JSON.stringify(data));
  }

  onMessage(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      callback(parsed);
    };
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }
}

export default new WebSocketService();
