class WebSocketService {
  private socket: WebSocket | null = null;

  connect(url: string) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onerror = (e) => {
      console.log("WebSocket error", e);
    };

    this.socket.onclose = () => {
      console.log("WebSocket closed");
    };
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
