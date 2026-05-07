// pages/api/socket.ts
import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { getToken } from "next-auth/jwt";
import { connectDB } from "@/lib/mongodb";
import Friend from "@/models/Friend";
import User from "@/models/User";
import FriendScoreLog from "@/models/FriendScoreLog";
import Score from "@/models/Score";
import GameQuestion from "@/models/GameQuestion";
import { isValidAdminPin } from "@/lib/admin";

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
    let currentQuestionCategory = "";
    let currentQuestionIndex = 0;
    let currentQuestionText = "";
    let rouletteSpinTimeout: ReturnType<typeof setTimeout> | null = null;
    const ROULETTE_SPIN_DURATION_MS = 5600;

    io.on("connection", async (socket) => {
      console.log("A user connected:", socket.id);

      const isAdminSocket = async () => {
        try {
          const pinFromHandshake = socket.handshake?.auth?.adminPin as
            | string
            | undefined;
          if (isValidAdminPin(pinFromHandshake)) {
            return true;
          }

          const token = await getToken({
            req: socket.request as any,
            secret: process.env.NEXTAUTH_SECRET,
          });
          if (!token?.sub) return false;
          const user = (await User.findOne({ snsId: token.sub })
            .select("role")
            .lean()) as { role?: string } | null;
          return user?.role === "admin";
        } catch (error) {
          console.error("Socket admin check failed:", error);
          return false;
        }
      };

      // 초기 상태 전달
      socket.emit("buzzer_order", buzzerOrder);
      socket.emit("game_state", gameStarted);
      socket.emit("blackboard_items", blackboardItems);
      socket.emit("question_state", {
        category: currentQuestionCategory,
        index: currentQuestionIndex,
        text: currentQuestionText,
      });
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
          (async () => {
            if (!(await isAdminSocket())) return;
            console.log("Game started");
            gameStarted = true;
            io.emit("game_state", gameStarted);
          })();
      });

      // 리셋(버저/게임상태)
      socket.on("reset_buzzer", () => {
          (async () => {
            if (!(await isAdminSocket())) return;
            console.log("Buzzer reset");
            buzzerOrder = [];
            gameStarted = false;
            io.emit("buzzer_order", buzzerOrder);
            io.emit("game_state", gameStarted);
          })();
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

        const friends = await Friend.find({})
          .select("name totalScore")
          .sort({ totalScore: -1 });

        const users = await User.find({})
          .select("name score")
          .sort({ score: -1 });

        socket.emit("friend_data", friends);
        socket.emit("team_data", friends);
        socket.emit("user_data", users);

        socket.on("friend_score_update", async (friendId, name, updateLog, score) => {
          try {
            if (!(await isAdminSocket())) return;
            let resolvedFriendId = friendId;
            if (friendId) {
              await Friend.updateOne({ _id: friendId }, { $inc: { totalScore: score } });
            } else {
              const friend = (await Friend.findOne({ name })
                .select("_id")
                .lean()) as { _id?: string } | null;
              if (!friend?._id) return;
              resolvedFriendId = String(friend._id);
              await Friend.updateOne({ _id: friend._id }, { $inc: { totalScore: score } });
            }

            await FriendScoreLog.create({
              friendId: resolvedFriendId,
              name,
              updateLog,
              score,
            });

            const updatedFriends = await Friend.find({})
              .select("name totalScore")
              .sort({ totalScore: -1 });

            io.emit("friend_data", updatedFriends);
            io.emit("team_data", updatedFriends);
          } catch (error) {
            console.error("Friend score update error:", error);
          }
        });

        socket.on("team_score_update", async (name, updateLog, score) => {
          try {
            const friend = (await Friend.findOne({ name })
              .select("_id")
              .lean()) as { _id?: string } | null;
            if (!friend?._id) return;
            await Friend.updateOne({ _id: friend._id }, { $inc: { totalScore: score } });
            await FriendScoreLog.create({
              friendId: friend._id,
              name,
              updateLog,
              score,
            });
            const updatedFriends = await Friend.find({})
              .select("name totalScore")
              .sort({ totalScore: -1 });
            io.emit("friend_data", updatedFriends);
            io.emit("team_data", updatedFriends);
          } catch (error) {
            console.error("Legacy team score update error:", error);
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

        const emitRouletteCandidates = async () => {
          const candidates = await Friend.find({ roulette: true })
            .select("_id name")
            .lean();
          io.emit(
            "roulette_candidates",
            candidates.map((candidate) => ({
              _id: String(candidate._id),
              name: String(candidate.name),
            }))
          );
        };

        await emitRouletteCandidates();

        socket.on("roulette_candidates_request", async () => {
          try {
            await emitRouletteCandidates();
          } catch (error) {
            console.error("Roulette candidates request error:", error);
          }
        });

        socket.on("roulette_spin_request", async () => {
          try {
            if (!(await isAdminSocket())) return;
            if (rouletteSpinTimeout) return;

            const candidates = await Friend.find({ roulette: true })
              .select("_id name")
              .lean();
            const serial = candidates.map((entry) => ({
              _id: String(entry._id),
              name: String(entry.name),
            }));

            if (!serial.length) {
              io.emit("roulette_result", { winner: null });
              return;
            }

            const winnerIndex = Math.floor(Math.random() * serial.length);
            const winner = serial[winnerIndex];
            const winnerDoc = candidates[winnerIndex];

            io.emit("roulette_spin_animation", {
              candidates: serial,
              winnerId: winner._id,
              spinDurationMs: ROULETTE_SPIN_DURATION_MS,
            });

            rouletteSpinTimeout = setTimeout(async () => {
              rouletteSpinTimeout = null;
              try {
                await Friend.updateOne(
                  { _id: winnerDoc._id },
                  { $set: { roulette: false } }
                );
                const updatedCandidates = await Friend.find({ roulette: true })
                  .select("_id name")
                  .lean();
                io.emit("roulette_result", { winner });
                io.emit(
                  "roulette_candidates",
                  updatedCandidates.map((candidate) => ({
                    _id: String(candidate._id),
                    name: String(candidate.name),
                  }))
                );
              } catch (commitError) {
                console.error("Roulette commit error:", commitError);
              }
            }, ROULETTE_SPIN_DURATION_MS);
          } catch (error) {
            console.error("Roulette spin error:", error);
          }
        });

        socket.on("roulette_reset_request", async () => {
          try {
            if (!(await isAdminSocket())) return;
            if (rouletteSpinTimeout) {
              clearTimeout(rouletteSpinTimeout);
              rouletteSpinTimeout = null;
            }
            await Friend.updateMany({}, { $set: { roulette: true } });
            io.emit("roulette_reset");

            const resetCandidates = await Friend.find({ roulette: true })
              .select("_id name")
              .lean();
            io.emit(
              "roulette_candidates",
              resetCandidates.map((candidate) => ({
                _id: String(candidate._id),
                name: String(candidate.name),
              }))
            );
            io.emit("roulette_result", { winner: null });
          } catch (error) {
            console.error("Roulette reset error:", error);
          }
        });

        const emitQuestionState = () => {
          io.emit("question_state", {
            category: currentQuestionCategory,
            index: currentQuestionIndex,
            text: currentQuestionText,
          });
        };

        socket.on("question_select_category", async (category: string) => {
          try {
            if (!(await isAdminSocket())) return;
            await GameQuestion.find({
              category,
              isActive: true,
            })
              .sort({ number: 1, createdAt: 1 })
              .lean();

            currentQuestionCategory = category;
            // 주제만 고른 직후: 1번 문제 텍스트는 보이지 않음(다음 버튼으로 진입).
            currentQuestionIndex = -1;
            currentQuestionText = "";
            emitQuestionState();
          } catch (error) {
            console.error("Question category select error:", error);
          }
        });

        socket.on("question_next", async () => {
          try {
            if (!(await isAdminSocket())) return;
            if (!currentQuestionCategory) return;
            const questions = await GameQuestion.find({
              category: currentQuestionCategory,
              isActive: true,
            })
              .sort({ number: 1, createdAt: 1 })
              .lean();
            if (!questions.length) return;

            if (currentQuestionIndex < 0) {
              currentQuestionIndex = 0;
              currentQuestionText = questions[0]?.text ?? "";
              emitQuestionState();
              return;
            }

            currentQuestionIndex = Math.min(
              currentQuestionIndex + 1,
              questions.length - 1
            );
            currentQuestionText = questions[currentQuestionIndex]?.text ?? "";
            emitQuestionState();
          } catch (error) {
            console.error("Question next error:", error);
          }
        });

        socket.on("question_prev", async () => {
          try {
            if (!(await isAdminSocket())) return;
            if (!currentQuestionCategory) return;
            const questions = await GameQuestion.find({
              category: currentQuestionCategory,
              isActive: true,
            })
              .sort({ number: 1, createdAt: 1 })
              .lean();
            if (!questions.length) return;

            if (currentQuestionIndex <= -1) {
              return;
            }
            if (currentQuestionIndex === 0) {
              currentQuestionIndex = -1;
              currentQuestionText = "";
              emitQuestionState();
              return;
            }

            currentQuestionIndex -= 1;
            currentQuestionText = questions[currentQuestionIndex]?.text ?? "";
            emitQuestionState();
          } catch (error) {
            console.error("Question prev error:", error);
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
