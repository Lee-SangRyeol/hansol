// pages/api/socket.ts
import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from 'http';
import { connectDB } from '@/lib/mongodb';
import Team from '@/models/Team';
import User from "@/models/User";
import TeamScore from '@/models/TeamScore';
import Score from '@/models/Score';

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

export default async function handler(req: NextApiRequest, res: NextApiResponseSocket) {
  if (!res.socket.server.io) {
    console.log("Starting Socket.io server...");
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket'],
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    let buzzerOrder: string[] = [];
    const MAX_BUZZER_ORDER = 5;

    io.on("connection", async (socket) => {
      console.log("A user connected:", socket.id);

      socket.emit("buzzer_order", buzzerOrder);

      socket.on("buzzer_press", (clientId: string) => {
        if (buzzerOrder.length < MAX_BUZZER_ORDER) {
          buzzerOrder.push(clientId);
          io.emit("buzzer_order", buzzerOrder);
        } else {
          socket.emit("buzzer_failed", "😝 ㅋㅋ 느려.");
        }
      });

      socket.on("reset_buzzer", () => {
        buzzerOrder = [];
        io.emit("buzzer_order", buzzerOrder);
      });

      try {
        await connectDB();
        
        const teams = await Team.find({})
          .select('name totalScore')
          .sort({ totalScore: -1 });
        
        const users = await User.find({})
          .select('name score')
          .sort({ score: -1 });

        socket.emit("team_data", teams);
        socket.emit("user_data", users);

        socket.on("team_score_update", async (name, updateLog, score) => {
          try {
            await Team.updateOne(
              { name: name },
              { $inc: { totalScore: score } }
            );

            await TeamScore.create({
              name: name,
              updateLog: updateLog,
              score: score
            });
            
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
              name: name,
              updateLog: updateLog,
              score: score
            });
            
            const updatedUsers = await User.find({})
              .select('name score')
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
