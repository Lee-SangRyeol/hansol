// pages/test.tsx
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const TestPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const handleConnect = () => {
    if (!isConnected && !socket) {
      socket = io({
        path: "/api/socket",
      });

      socket.on("connect", () => {
        console.log("Connected to server:", socket!.id);
        setIsConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });

      socket.on("message", (msg) => {
        setMessages((prevMessages) => [...prevMessages, msg]);
        console.log("Message from server:", msg);
      });
    }
  };

  const sendMessage = () => {
    if (socket && isConnected) {
      socket.emit("message", socket!.id);
      setMessages((prevMessages) => [...prevMessages, `${socket!.id}`]);
    } else {
      console.log("Socket is not connected or message is empty.");
    }
  };

  return (
    <div>
      <h1>Test Socket Connection</h1>
      <button onClick={handleConnect} disabled={isConnected}>
        {isConnected ? "Connected" : "Connect to Socket"}
      </button>
      <div style={{ marginTop: "20px" }}>
     
        <button
          onClick={sendMessage}
        >
          Send Message
        </button>
      </div>
      <div
        style={{
          marginTop: "20px",
          border: "1px solid #ccc",
          padding: "10px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        <h2>Messages</h2>
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
    </div>
  );
};

export default TestPage;
