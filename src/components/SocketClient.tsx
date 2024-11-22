// components/SocketClient.tsx
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

const SocketClient = () => {
  useEffect(() => {
    socket = io({
      path: "/api/socket",
    });

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
    });

    socket.on("message", (msg) => {
      console.log("Message from server:", msg);
    });

    // 클린업: 컴포넌트가 언마운트될 때 소켓 연결 해제
    return () => {
      socket.disconnect();
    };
  }, []);

  const sendMessage = () => {
    socket.emit("message", "Hello from client!");
  };

  return (
    <div>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
};

export default SocketClient;
