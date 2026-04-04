let socket: WebSocket | null = null;

export function connect(channelId: string) {
  socket = new WebSocket(
    `wss://quickexchange.ru/socket?channelId=${channelId}`,
  );

  socket.onopen = () => {
    console.log("WS connected");
  };

  socket.onclose = () => {
    console.log("WS disconnected");
  };

  socket.onerror = (e) => {
    console.log("WS error", e);
  };

  return socket;
}

export function getSocket() {
  return socket;
}
