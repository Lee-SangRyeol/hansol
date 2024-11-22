// pages/api/socket.ts
import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';
import User from "@/models/User";
import TeamScore from "@/models/TeamScore";
import Score from "@/models/Score";

interface SocketWithIO extends NetSocket {
  server: HTTPServer & { io?: Server };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const socket = res.socket as SocketWithIO;

  if (!socket.server.io) {
    console.log("Starting Socket.io server...");
    const io = new Server(socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });
    socket.server.io = io;

    let buzzerOrder: string[] = [];
    const MAX_BUZZER_ORDER = 5; // 최대 5개로 제한

    io.on("connection", async (socket) => {
      console.log("A user connected:", socket.id);

      // 새로운 클라이언트 연결시 현재 버저 순서 전송
      socket.emit("buzzer_order", buzzerOrder);

      socket.on("buzzer_press", (clientId: string) => {
        // 버저 순서가 5개 미만일 때만 추가
        if (buzzerOrder.length < MAX_BUZZER_ORDER) {
          buzzerOrder.push(clientId);
          // 모든 클라이언트에게 업데이트된 순서 브로드캐스트
          io.emit("buzzer_order", buzzerOrder);
        } else {
          socket.emit("buzzer_failed", "😝 ㅋㅋ 느려.");
        }
      });

      // 버저 순서 초기화 이벤트 추가
      socket.on("reset_buzzer", () => {
        buzzerOrder = [];
        // 초기화된 순서를 모든 클라이언트에게 브로드캐스트
        io.emit("buzzer_order", buzzerOrder);
      });

      try {
        // MongoDB 연결
        await connectDB();
        
        // 팀 데이터 가져오기
        const teams = await Team.find({})
          .select('name totalScore')
          .sort({ totalScore: -1 }); // 점수 내림차순 정렬
        
        const users = await User.find({})
          .select('name score')
          .sort({ score: -1 }); // 점수 내림차순 정렬
        // 팀 데이터 전송
        socket.emit("team_data", teams);

        socket.emit("user_data", users);

        socket.on("team_score_update", async (name, updateLog, score) => {
          try {
            await Team.updateOne(
              { name: name },
              { $inc: { totalScore: score } }
            );

            await TeamScore.create({
              name:name,
              updateLog:updateLog,
              score:score
            })
            
            const updatedTeams = await Team.find({})
              .select('name totalScore')
              .sort({ totalScore: -1 });
            
            io.emit("team_data", updatedTeams);
          } catch (error) {
            console.error("Team score update error:", error);
          }
        });

        socket.on("solo_score_update", async (name, updateLog, score) => {
          try {
            await User.updateOne(
              { name: name },
              { $inc: { score: score } }
            );

            await Score.create({
              name:name,
              updateLog:updateLog,
              score:score
            })
            
            const updatedUsers = await User.find({})
              .select('name score')
              .sort({ score: -1 });
            
            io.emit("user_data", updatedUsers);
          } catch (error) {
            console.error("Team score update error:", error);
          }
        });

      } catch (error) {
        console.error("Team data fetch error:", error);
      }

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  } else {
    console.log("Socket.io server already running");
  }

  res.end();
}
