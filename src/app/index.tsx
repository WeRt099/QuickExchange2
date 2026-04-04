import { router } from "expo-router";
import { useEffect } from "react";
import HelloCatScreen from "../app/first";

export default function Index() {
  useEffect(() => {
    const init = async () => {
      try {
        // 👇 проверка сервера (можешь пока закомментить)
        await checkServer();

        // небольшая задержка (чтобы котик был виден)
        await new Promise((res) => setTimeout(res, 1500));

        router.replace("/main");
      } catch (e) {
        router.replace("/error");
      }
    };

    init();
  }, []);

  return <HelloCatScreen />;
}

// 👇 вынеси потом в utils
const checkServer = () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      "wss://quickexchange.ru/socket?channelId=healthcheck",
    );

    const timeout = setTimeout(() => {
      ws.close();
      reject("timeout");
    }, 3000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "pong") {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject("error");
    };
  });
};
