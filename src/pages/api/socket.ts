// pages/api/socket.ts
import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { connectDB } from "@/lib/mongodb";
import Team from "@/models/Team";
import User from "@/models/User";
import TeamScore from "@/models/TeamScore";
import Score from "@/models/Score";

export const config = {
  api: {
    bodyParser: false,
  },
};

interface SocketServer extends NetServer {
  io?: Server;
}

interface NextApiResponseSocket extends NextApiResponse {
  socket: any & {
    server: SocketServer;
  };
}

interface BlackboardItem {
  id: string;
  type: "text" | "image" | "game";
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  timestamp: Date;
  gameType?: string;
  category?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseSocket
) {
  if (!res.socket.server.io) {
    console.log("Starting Socket.io server...");
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    let buzzerOrder: string[] = [];
    const MAX_BUZZER_ORDER = 5;
    let gameStarted = false;
    let blackboardItems: BlackboardItem[] = [];

    io.on("connection", async (socket) => {
      console.log("A user connected:", socket.id);

      // 초기 상태 전달
      socket.emit("buzzer_order", buzzerOrder);
      socket.emit("game_state", gameStarted);
      socket.emit("blackboard_items", blackboardItems);
      console.log("Initial blackboard items sent:", blackboardItems);

      // 버저 입력
      socket.on("buzzer_press", (clientId: string) => {
        console.log("Buzzer pressed by:", clientId);
        if (buzzerOrder.length < MAX_BUZZER_ORDER) {
          buzzerOrder.push(clientId);
          io.emit("buzzer_order", buzzerOrder);
        } else {
          socket.emit("buzzer_failed", "😝 ㅋㅋ 느려.");
        }
      });

      // 게임 시작
      socket.on("start_game", () => {
        console.log("Game started");
        gameStarted = true;
        io.emit("game_state", gameStarted);
      });

      // 리셋(버저/게임상태)
      socket.on("reset_buzzer", () => {
        console.log("Buzzer reset");
        buzzerOrder = [];
        gameStarted = false;
        io.emit("buzzer_order", buzzerOrder);
        io.emit("game_state", gameStarted);
      });

      // 칠판 아이템 추가 (관리자만)
      socket.on(
        "add_blackboard_item",
        (item: Omit<BlackboardItem, "id" | "timestamp">) => {
          console.log("Received add_blackboard_item:", item);
          const newItem: BlackboardItem = {
            ...item,
            id: Date.now().toString(),
            timestamp: new Date(),
          };
          blackboardItems.push(newItem);
          console.log("Added new item, total items:", blackboardItems.length);
          io.emit("blackboard_items", blackboardItems);
        }
      );

      // 칠판 아이템 수정 (관리자만)
      socket.on(
        "update_blackboard_item",
        (itemId: string, updates: Partial<BlackboardItem>) => {
          console.log("Received update_blackboard_item:", itemId, updates);
          const index = blackboardItems.findIndex((item) => item.id === itemId);
          if (index !== -1) {
            blackboardItems[index] = { ...blackboardItems[index], ...updates };
            console.log("Updated item:", blackboardItems[index]);
            io.emit("blackboard_items", blackboardItems);
          } else {
            console.log("Item not found for update:", itemId);
          }
        }
      );

      // 칠판 아이템 삭제 (관리자만)
      socket.on("delete_blackboard_item", (itemId: string) => {
        console.log("Received delete_blackboard_item:", itemId);
        const beforeLength = blackboardItems.length;
        blackboardItems = blackboardItems.filter((item) => item.id !== itemId);
        console.log(
          "Deleted item, before:",
          beforeLength,
          "after:",
          blackboardItems.length
        );
        io.emit("blackboard_items", blackboardItems);
      });

      // 칠판 전체 초기화 (관리자만)
      socket.on("clear_blackboard", () => {
        console.log("Received clear_blackboard");
        blackboardItems = [];
        io.emit("blackboard_items", blackboardItems);
      });

      // 초기 데이터 및 점수 업데이트
      try {
        await connectDB();

        const teams = await Team.find({})
          .select("name totalScore")
          .sort({ totalScore: -1 });

        const users = await User.find({})
          .select("name score")
          .sort({ score: -1 });

        socket.emit("team_data", teams);
        socket.emit("user_data", users);

        socket.on("team_score_update", async (name, updateLog, score) => {
          try {
            await Team.updateOne({ name }, { $inc: { totalScore: score } });

            await TeamScore.create({ name, updateLog, score });

            const updatedTeams = await Team.find({})
              .select("name totalScore")
              .sort({ totalScore: -1 });

            io.emit("team_data", updatedTeams);
          } catch (error) {
            console.error("Team score update error:", error);
          }
        });

        socket.on("solo_score_update", async (name, updateLog, score) => {
          try {
            await User.updateOne({ name }, { $inc: { score } });

            await Score.create({ name, updateLog, score });

            const updatedUsers = await User.find({})
              .select("name score")
              .sort({ score: -1 });

            io.emit("user_data", updatedUsers);
          } catch (error) {
            console.error("Solo score update error:", error);
          }
        });
      } catch (error) {
        console.error("Data fetch error:", error);
      }

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
