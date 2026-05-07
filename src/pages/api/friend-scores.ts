import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/lib/mongodb";
import Friend from "@/models/Friend";
import FriendScoreLog from "@/models/FriendScoreLog";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      await connectDB();
      const { friendId } = req.query;

      if (!friendId || typeof friendId !== "string") {
        return res.status(400).json({ error: "friendId가 필요합니다." });
      }

      const logs = await FriendScoreLog.find({ friendId })
        .select("updateLog score createdAt")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json(logs);
    } catch (error) {
      console.error("Error fetching friend score logs:", error);
      return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
  }

  if (req.method === "POST") {
    try {
      await connectDB();
      const { friendId, updateLog, score } = req.body as {
        friendId?: string;
        updateLog?: string;
        score?: number;
      };

      if (!friendId || !updateLog || score === undefined) {
        return res.status(400).json({ error: "필수값이 누락되었습니다." });
      }

      const friend = await Friend.findById(friendId);
      if (!friend) {
        return res.status(404).json({ error: "단짝을 찾을 수 없습니다." });
      }

      await Friend.updateOne({ _id: friendId }, { $inc: { totalScore: score } });
      const log = await FriendScoreLog.create({
        friendId,
        name: friend.name,
        updateLog,
        score,
      });

      return res.status(201).json(log);
    } catch (error) {
      console.error("Error creating friend score log:", error);
      return res.status(500).json({ error: "점수 저장에 실패했습니다." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
